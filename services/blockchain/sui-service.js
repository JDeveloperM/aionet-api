const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { logger } = require('../../config/logger');

/**
 * Sui Blockchain Service
 * Handles general Sui blockchain operations
 */

class SuiService {
  constructor() {
    this.suiClient = new SuiClient({
      url: process.env.SUI_RPC_URL || getFullnodeUrl('testnet')
    });
    this.cache = new Map();
    this.CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Cache management
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Get user's SUI balance
   */
  async getUserBalance(userAddress) {
    try {
      const cacheKey = `balance_${userAddress}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting SUI balance for ${userAddress}`);

      const balance = await this.suiClient.getBalance({
        owner: userAddress,
        coinType: '0x2::sui::SUI'
      });

      const balanceInSui = parseFloat(balance.totalBalance) / 1_000_000_000; // Convert MIST to SUI
      
      this.setCachedData(cacheKey, balanceInSui);
      return balanceInSui;
    } catch (error) {
      logger.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionHash) {
    try {
      const cacheKey = `tx_${transactionHash}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting transaction details for ${transactionHash}`);

      const transaction = await this.suiClient.getTransactionBlock({
        digest: transactionHash,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true,
          showBalanceChanges: true
        }
      });

      this.setCachedData(cacheKey, transaction);
      return transaction;
    } catch (error) {
      logger.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(transactionHash, expectedSender, expectedAmount) {
    try {
      logger.info(`Verifying transaction ${transactionHash}`);

      const transaction = await this.getTransaction(transactionHash);
      
      if (!transaction) {
        return { valid: false, error: 'Transaction not found' };
      }

      // Check if transaction was successful
      if (transaction.effects?.status?.status !== 'success') {
        return { valid: false, error: 'Transaction failed' };
      }

      // Verify sender
      const sender = transaction.transaction?.data?.sender;
      if (sender !== expectedSender) {
        return { 
          valid: false, 
          error: `Sender mismatch. Expected: ${expectedSender}, Got: ${sender}` 
        };
      }

      // Verify amount if provided
      if (expectedAmount) {
        const balanceChanges = transaction.balanceChanges || [];
        const senderChanges = balanceChanges.filter(change => 
          change.owner?.AddressOwner === expectedSender && 
          change.coinType === '0x2::sui::SUI'
        );

        const totalSent = senderChanges.reduce((sum, change) => {
          return sum + Math.abs(parseInt(change.amount));
        }, 0);

        const expectedMist = Math.floor(expectedAmount * 1_000_000_000);
        const tolerance = 0.01 * 1_000_000_000; // 1% tolerance

        if (Math.abs(totalSent - expectedMist) > tolerance) {
          return { 
            valid: false, 
            error: `Amount mismatch. Expected: ${expectedAmount} SUI, Got: ${totalSent / 1_000_000_000} SUI` 
          };
        }
      }

      return { valid: true, transaction };
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      return { valid: false, error: 'Verification failed' };
    }
  }

  /**
   * Get user's owned objects
   */
  async getUserObjects(userAddress, objectType = null) {
    try {
      const cacheKey = `objects_${userAddress}_${objectType || 'all'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting objects for ${userAddress}`);

      const options = {
        owner: userAddress,
        options: {
          showContent: true,
          showType: true,
          showDisplay: true
        }
      };

      if (objectType) {
        options.filter = { StructType: objectType };
      }

      const objects = await this.suiClient.getOwnedObjects(options);
      
      this.setCachedData(cacheKey, objects.data || []);
      return objects.data || [];
    } catch (error) {
      logger.error('Error getting user objects:', error);
      return [];
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo() {
    try {
      const cacheKey = 'network_info';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info('Getting network info');

      const [chainId, referenceGasPrice, totalSupply] = await Promise.all([
        this.suiClient.getChainIdentifier(),
        this.suiClient.getReferenceGasPrice(),
        this.suiClient.getTotalSupply({ coinType: '0x2::sui::SUI' })
      ]);

      const networkInfo = {
        chainId,
        referenceGasPrice: referenceGasPrice.toString(),
        totalSupply: totalSupply.value,
        network: process.env.SUI_NETWORK || 'testnet'
      };

      this.setCachedData(cacheKey, networkInfo);
      return networkInfo;
    } catch (error) {
      logger.error('Error getting network info:', error);
      return null;
    }
  }

  /**
   * Get gas price
   */
  async getGasPrice() {
    try {
      const gasPrice = await this.suiClient.getReferenceGasPrice();
      return parseInt(gasPrice.toString());
    } catch (error) {
      logger.error('Error getting gas price:', error);
      return 1000; // Default gas price
    }
  }

  /**
   * Estimate transaction cost
   */
  async estimateTransactionCost(transactionBytes) {
    try {
      logger.info('Estimating transaction cost');

      const dryRun = await this.suiClient.dryRunTransactionBlock({
        transactionBlock: transactionBytes
      });

      if (dryRun.effects.status.status !== 'success') {
        throw new Error('Transaction simulation failed');
      }

      const gasCost = dryRun.effects.gasUsed;
      const totalCost = parseInt(gasCost.computationCost) + 
                       parseInt(gasCost.storageCost) - 
                       parseInt(gasCost.storageRebate);

      return {
        gasCost: totalCost,
        gasCostSui: totalCost / 1_000_000_000,
        gasUsed: gasCost
      };
    } catch (error) {
      logger.error('Error estimating transaction cost:', error);
      return {
        gasCost: 1_000_000, // 0.001 SUI default
        gasCostSui: 0.001,
        gasUsed: null
      };
    }
  }

  /**
   * Get events by transaction
   */
  async getEventsByTransaction(transactionHash) {
    try {
      const cacheKey = `events_${transactionHash}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting events for transaction ${transactionHash}`);

      const events = await this.suiClient.queryEvents({
        query: { Transaction: transactionHash }
      });

      this.setCachedData(cacheKey, events.data || []);
      return events.data || [];
    } catch (error) {
      logger.error('Error getting events:', error);
      return [];
    }
  }

  /**
   * Get latest transactions for address
   */
  async getLatestTransactions(address, limit = 10) {
    try {
      const cacheKey = `latest_tx_${address}_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      logger.info(`Getting latest transactions for ${address}`);

      const transactions = await this.suiClient.queryTransactionBlocks({
        filter: {
          FromAddress: address
        },
        options: {
          showEffects: true,
          showEvents: true,
          showBalanceChanges: true
        },
        limit,
        order: 'descending'
      });

      this.setCachedData(cacheKey, transactions.data || []);
      return transactions.data || [];
    } catch (error) {
      logger.error('Error getting latest transactions:', error);
      return [];
    }
  }

  /**
   * Check if address is valid
   */
  isValidAddress(address) {
    try {
      // Basic validation for Sui address format
      return typeof address === 'string' && 
             address.startsWith('0x') && 
             address.length >= 42 && 
             /^0x[a-fA-F0-9]+$/.test(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get client instance
   */
  getClient() {
    return this.suiClient;
  }
}

module.exports = new SuiService();
