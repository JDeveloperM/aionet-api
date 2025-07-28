const crypto = require('crypto');

/**
 * Cryptographic Utilities
 * Handle encryption, hashing, and other crypto operations
 */

/**
 * Generate a random salt
 */
function generateSalt(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password with salt
 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hash, salt) {
  const hashToVerify = hashPassword(password, salt);
  return hashToVerify === hash;
}

/**
 * Generate a secure random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create HMAC signature
 */
function createHMAC(data, secret, algorithm = 'sha256') {
  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
function verifyHMAC(data, signature, secret, algorithm = 'sha256') {
  const expectedSignature = createHMAC(data, secret, algorithm);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(text, key) {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedData, key) {
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(
    algorithm, 
    key, 
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Hash data using SHA-256
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using SHA-512
 */
function sha512(data) {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Generate a cryptographically secure random number
 */
function secureRandom(min = 0, max = 1) {
  const range = max - min;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const randomBytes = crypto.randomBytes(bytesNeeded);
  const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
  
  return min + (randomValue % range);
}

/**
 * Create a deterministic hash from multiple inputs
 */
function createDeterministicHash(...inputs) {
  const combined = inputs.join('|');
  return sha256(combined);
}

/**
 * Validate wallet address format
 */
function isValidWalletAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Basic Sui address validation
  return address.startsWith('0x') && 
         address.length >= 42 && 
         /^0x[a-fA-F0-9]+$/.test(address);
}

/**
 * Normalize wallet address (lowercase)
 */
function normalizeWalletAddress(address) {
  if (!isValidWalletAddress(address)) {
    throw new Error('Invalid wallet address format');
  }
  
  return address.toLowerCase();
}

/**
 * Generate a nonce for replay attack prevention
 */
function generateNonce() {
  return Date.now().toString() + generateToken(16);
}

/**
 * Validate nonce (basic timestamp check)
 */
function validateNonce(nonce, maxAge = 5 * 60 * 1000) { // 5 minutes
  try {
    const timestamp = parseInt(nonce.substring(0, 13));
    const now = Date.now();
    
    return (now - timestamp) <= maxAge;
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateToken,
  createHMAC,
  verifyHMAC,
  encrypt,
  decrypt,
  generateUUID,
  sha256,
  sha512,
  secureRandom,
  createDeterministicHash,
  isValidWalletAddress,
  normalizeWalletAddress,
  generateNonce,
  validateNonce
};
