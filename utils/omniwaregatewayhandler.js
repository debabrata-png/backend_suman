const crypto = require('crypto');

class OmniwarePaymentHandler {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.salt = config.salt || '';
    this.env = config.env || 'test'; // 'test' or 'prod'
    this.baseUrl = 'https://pgbiz.omniware.in/v2/paymentrequest';
  }

  /**
   * Generate SHA512 Hash for Payment Initiation
   * Formula: SALT|sorted_values
   */
  generateHash(params) {
    const shasum = crypto.createHash('sha512');
    
    // Sort keys alphabetically
    const keys = Object.keys(params).sort();
    
    let hashData = this.salt;
    
    keys.forEach(key => {
      const value = params[key];
      if (key !== 'hash' && value !== undefined && value !== null) {
        const valStr = value.toString().trim();
        if (valStr.length > 0) {
          hashData += '|' + valStr;
        }
      }
    });

    return shasum.update(hashData).digest('hex').toUpperCase();
  }

  /**
   * Verify Hash for Response
   */
  verifyResponseHash(params) {
    if (!params.hash) return false;
    
    const calculatedHash = this.generateHash(params);
    return calculatedHash === params.hash.toUpperCase();
  }
}

module.exports = OmniwarePaymentHandler;
