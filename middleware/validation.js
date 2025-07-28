const { logger } = require('../config/logger');

/**
 * Validation Middleware
 * Common validation functions for request data
 */

/**
 * Validate wallet address format
 */
const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required and must be a string' };
  }

  if (!address.startsWith('0x')) {
    return { valid: false, error: 'Address must start with 0x' };
  }

  if (address.length < 42) {
    return { valid: false, error: 'Address must be at least 42 characters long' };
  }

  if (!/^0x[a-fA-F0-9]+$/.test(address)) {
    return { valid: false, error: 'Address contains invalid characters' };
  }

  return { valid: true };
};

/**
 * Validate transaction hash format
 */
const validateTransactionHash = (hash) => {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, error: 'Transaction hash is required and must be a string' };
  }

  if (!hash.startsWith('0x')) {
    return { valid: false, error: 'Transaction hash must start with 0x' };
  }

  if (hash.length < 42) {
    return { valid: false, error: 'Transaction hash must be at least 42 characters long' };
  }

  if (!/^0x[a-fA-F0-9]+$/.test(hash)) {
    return { valid: false, error: 'Transaction hash contains invalid characters' };
  }

  return { valid: true };
};

/**
 * Validate amount (positive number)
 */
const validateAmount = (amount) => {
  if (amount === undefined || amount === null) {
    return { valid: false, error: 'Amount is required' };
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (numAmount > 1000000) {
    return { valid: false, error: 'Amount is too large' };
  }

  return { valid: true, value: numAmount };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (limit, offset) => {
  const parsedLimit = parseInt(limit) || 50;
  const parsedOffset = parseInt(offset) || 0;

  if (parsedLimit < 1 || parsedLimit > 1000) {
    return { valid: false, error: 'Limit must be between 1 and 1000' };
  }

  if (parsedOffset < 0) {
    return { valid: false, error: 'Offset must be non-negative' };
  }

  return { 
    valid: true, 
    value: { 
      limit: parsedLimit, 
      offset: parsedOffset 
    } 
  };
};

/**
 * Validate date range
 */
const validateDateRange = (dateFrom, dateTo) => {
  const errors = [];

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (isNaN(fromDate.getTime())) {
      errors.push('Invalid dateFrom format');
    }
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    if (isNaN(toDate.getTime())) {
      errors.push('Invalid dateTo format');
    }
  }

  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (fromDate > toDate) {
      errors.push('dateFrom must be before dateTo');
    }

    // Check if range is too large (more than 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > oneYear) {
      errors.push('Date range cannot exceed 1 year');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate NFT tier
 */
const validateNFTTier = (tier) => {
  const validTiers = ['PRO', 'ROYAL'];
  
  if (!tier || typeof tier !== 'string') {
    return { valid: false, error: 'Tier is required and must be a string' };
  }

  if (!validTiers.includes(tier.toUpperCase())) {
    return { 
      valid: false, 
      error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` 
    };
  }

  return { valid: true, value: tier.toUpperCase() };
};

/**
 * Validate trading activity data
 */
const validateTradingActivity = (data) => {
  const errors = [];

  // Required fields
  const requiredFields = ['trade_type', 'symbol', 'amount', 'price', 'trade_opened_at'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }

  // Validate trade_type
  const validTradeTypes = ['buy', 'sell', 'long', 'short'];
  if (data.trade_type && !validTradeTypes.includes(data.trade_type.toLowerCase())) {
    errors.push(`Invalid trade_type. Must be one of: ${validTradeTypes.join(', ')}`);
  }

  // Validate amounts
  if (data.amount) {
    const amountValidation = validateAmount(data.amount);
    if (!amountValidation.valid) {
      errors.push(`Amount: ${amountValidation.error}`);
    }
  }

  if (data.price) {
    const priceValidation = validateAmount(data.price);
    if (!priceValidation.valid) {
      errors.push(`Price: ${priceValidation.error}`);
    }
  }

  // Validate dates
  if (data.trade_opened_at) {
    const openDate = new Date(data.trade_opened_at);
    if (isNaN(openDate.getTime())) {
      errors.push('Invalid trade_opened_at date format');
    }
  }

  if (data.trade_closed_at) {
    const closeDate = new Date(data.trade_closed_at);
    if (isNaN(closeDate.getTime())) {
      errors.push('Invalid trade_closed_at date format');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate notification data
 */
const validateNotification = (data) => {
  const errors = [];

  // Required fields
  const requiredFields = ['title', 'message', 'type', 'category'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }

  // Validate type
  const validTypes = ['info', 'success', 'warning', 'error'];
  if (data.type && !validTypes.includes(data.type.toLowerCase())) {
    errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate category
  const validCategories = ['system', 'trading', 'nft', 'affiliate', 'general'];
  if (data.category && !validCategories.includes(data.category.toLowerCase())) {
    errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  // Validate title and message length
  if (data.title && data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (data.message && data.message.length > 1000) {
    errors.push('Message must be 1000 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input
 */
const sanitizeString = (str, maxLength = 1000) => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
};

/**
 * Middleware to validate common request parameters
 */
const validateCommonParams = (req, res, next) => {
  try {
    const errors = [];

    // Validate user address if present
    if (req.body.user_address || req.params.address || req.query.user_address) {
      const address = req.body.user_address || req.params.address || req.query.user_address;
      const addressValidation = validateWalletAddress(address);
      if (!addressValidation.valid) {
        errors.push(`User address: ${addressValidation.error}`);
      }
    }

    // Validate pagination if present
    if (req.query.limit || req.query.offset) {
      const paginationValidation = validatePagination(req.query.limit, req.query.offset);
      if (!paginationValidation.valid) {
        errors.push(`Pagination: ${paginationValidation.error}`);
      } else {
        req.pagination = paginationValidation.value;
      }
    }

    // Validate date range if present
    if (req.query.dateFrom || req.query.dateTo) {
      const dateValidation = validateDateRange(req.query.dateFrom, req.query.dateTo);
      if (!dateValidation.valid) {
        errors.push(`Date range: ${dateValidation.errors.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    next();
  } catch (error) {
    logger.error('Error in common params validation:', error);
    return res.status(500).json({
      error: 'Validation failed',
      code: 'VALIDATION_FAILED'
    });
  }
};

module.exports = {
  validateWalletAddress,
  validateTransactionHash,
  validateAmount,
  validatePagination,
  validateDateRange,
  validateNFTTier,
  validateTradingActivity,
  validateNotification,
  sanitizeString,
  validateCommonParams
};
