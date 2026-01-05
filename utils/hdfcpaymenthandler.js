const fs = require("fs");
const { EOL } = require("os");
const path = require("path");
const crypto = require("crypto");

/**
 * SimpleLogger - File-based logging utility
 */
class SimpleLogger {
  disablelogging = false;
  static hdfcinstance = undefined;

  constructor(logfilepath) {
    this.disablelogging = false;
    if (SimpleLogger.hdfcinstance !== undefined) {
      return SimpleLogger.hdfcinstance;
    }

    const dirname = path.dirname(logfilepath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    this.logfilepath = logfilepath;
    SimpleLogger.hdfcinstance = this;
    return SimpleLogger.hdfcinstance;
  }

  log(level, apitag, paymentrequestid, message, value) {
    if (this.disablelogging) return;
    
    const timestamp = this.formatdatetime(Date.now());
    let valuestr = value;
    if (typeof value === "object") {
      valuestr = JSON.stringify(value);
    }

    const logmessage = `${timestamp} [${level.toUpperCase()}] apitag=${apitag}, paymentrequestid=${paymentrequestid}, message=${message}, value=${valuestr}${EOL}`;
    fs.appendFile(this.logfilepath, logmessage, () => {});
  }

  info(apitag, paymentrequestid, message, value) {
    this.log("info", apitag, paymentrequestid, message, value);
  }

  error(apitag, paymentrequestid, message, value) {
    this.log("error", apitag, paymentrequestid, message, value);
  }

  formatdatetime(timestamp) {
    const date = new Date(timestamp);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = date.getDate();
    let hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${month} ${day}, ${year} ${hour}:${minute}:${second} ${period}`;
  }
}

/**
 * HDFCPaymentHandler - Singleton class for HDFC payment gateway integration
 * Uses Juspay API (HDFC's payment gateway provider)
 */
class HDFCPaymentHandler {
  static paymenthandlerinstance = undefined;

  /**
   * Get singleton instance
   * @param {Object} gatewayconfig - HDFC gateway configuration
   */
  static getinstance(gatewayconfig) {
    if (!HDFCPaymentHandler.paymenthandlerinstance) {
      return new HDFCPaymentHandler(gatewayconfig);
    }
    // Update config if new one provided
    if (gatewayconfig) {
      HDFCPaymentHandler.paymenthandlerinstance.gatewayconfig = gatewayconfig;
    }
    return HDFCPaymentHandler.paymenthandlerinstance;
  }

  constructor(gatewayconfig) {
    if (HDFCPaymentHandler.paymenthandlerinstance !== undefined) {
      return HDFCPaymentHandler.paymenthandlerinstance;
    }

    if (!gatewayconfig) {
      throw new TypeError("Gateway configuration is required");
    }

    this.gatewayconfig = gatewayconfig;
    this.validategatewayconfig();
    
    // Initialize logger
    this.logger = new SimpleLogger(this.getloggingpath());
    this.logger.disablelogging = !this.getenablelogging();
    
    HDFCPaymentHandler.paymenthandlerinstance = this;
    return HDFCPaymentHandler.paymenthandlerinstance;
  }

  /**
   * Create order session (initiate payment)
   * @param {Object} params - Order session parameters
   * @returns {Promise} - Order session response
   */
  async createordersession(params) {
    this.validateparams(params);
    
    return this.makeservicecall({
      apitag: "HDFC_ORDER_SESSION",
      method: "POST",
      path: "/session",
      body: {
        payment_page_client_id: this.gatewayconfig.paymentpageclientid,
        ...params,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Check order status
   * @param {String} orderid - Merchant transaction ID
   * @returns {Promise} - Order status response
   */
  async checkorderstatus(orderid) {
    if (!orderid) {
      throw new HDFCAPIException(
        -1,
        "INVALID_PARAMS",
        "INVALID_PARAMS",
        "order_id is required"
      );
    }

    return this.makeservicecall({
      apitag: "HDFC_ORDER_STATUS",
      method: "GET",
      path: `/orders/${orderid}`,
      query: { 
        details: "false" 
      },
    });
  }

  /**
   * Initiate refund
   * @param {Object} params - Refund parameters
   * @returns {Promise} - Refund response
   */
  async initiaterefund(params) {
    this.validateparams(params);
    
    return this.makeservicecall({
      apitag: "HDFC_ORDER_REFUND",
      method: "POST",
      path: `/refunds`,
      body: params,
    });
  }

  /**
   * Make API service call using fetch
   * @param {Object} options - API call options
   * @returns {Promise} - API response
   */
  async makeservicecall({ apitag, path, method, headers = {}, query = {}, body }) {
    const paymentrequestid = this.generateuuid();
    
    try {
      // Prepare headers
      const requestheaders = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "NODEJS_KIT/1.0.0",
        "version": this.getversion(),
        "x-merchantid": this.gatewayconfig.merchantid,
        ...headers,
        "Authorization": "Basic " + this.base64encode(this.gatewayconfig.apikey),
      };

      // Build URL with query params
      let url = `${this.gatewayconfig.baseurl}${path}`;
      if (query && Object.keys(query).length > 0) {
        const querystring = this.preparequerystring(query);
        url += `?${querystring}`;
      }

      // Prepare request options
      const requestoptions = {
        method: method,
        headers: requestheaders,
      };

      // Add body for POST/PUT requests
      if (body && (method === "POST" || method === "PUT")) {
        if (requestheaders["Content-Type"] === "application/json") {
          requestoptions.body = JSON.stringify(body);
          this.logger.info(apitag, paymentrequestid, "Request Body (JSON)", body);
        } else {
          // application/x-www-form-urlencoded
          requestoptions.body = this.prepareformdata(body);
          this.logger.info(apitag, paymentrequestid, "Request Body (Form)", body);
        }
      }

      this.logger.info(apitag, paymentrequestid, "Request URL", url);
      this.logger.info(apitag, paymentrequestid, "Request Headers", requestheaders);

      // Make API call
      const response = await fetch(url, requestoptions);
      
      this.logger.info(apitag, paymentrequestid, "Response Status", response.status);

      // Parse response
      const responsetext = await response.text();
      this.logger.info(apitag, paymentrequestid, "Response Body", responsetext);

      let responsedata;
      try {
        responsedata = JSON.parse(responsetext);
      } catch (parseerror) {
        this.logger.error(apitag, paymentrequestid, "JSON Parse Error", parseerror);
        throw new HDFCAPIException(
          response.status,
          "INVALID_RESPONSE",
          "INVALID_RESPONSE",
          "Failed to parse response JSON"
        );
      }

      // Check if response is successful
      if (response.status >= 200 && response.status < 300) {
        return responsedata;
      } else {
        // Handle error response
        const status = responsedata.status || "ERROR";
        const errorcode = responsedata.error_code || "UNKNOWN_ERROR";
        const errormessage = responsedata.error_message || responsetext;
        
        this.logger.error(apitag, paymentrequestid, "API Error", responsedata);
        
        throw new HDFCAPIException(
          response.status,
          status,
          errorcode,
          errormessage
        );
      }
    } catch (error) {
      this.logger.error(apitag, paymentrequestid, "Request Failed", error.message);
      
      if (error instanceof HDFCAPIException) {
        throw error;
      }
      
      // Network or other errors
      throw new HDFCAPIException(
        -1,
        "NETWORK_ERROR",
        "NETWORK_ERROR",
        error.message || "Failed to connect to HDFC gateway"
      );
    }
  }

  /**
   * Validate gateway configuration
   */
  validategatewayconfig() {
    const requiredfields = [
      'merchantid',
      'apikey',
      'paymentpageclientid',
      'responsekey',
      'baseurl'
    ];

    for (const field of requiredfields) {
      if (!this.gatewayconfig[field]) {
        throw new TypeError(`${field} is required in gateway configuration`);
      }
    }
  }

  /**
   * Validate API parameters
   */
  validateparams(params) {
    if (typeof params !== "object" || params === null) {
      throw new HDFCAPIException(
        -1,
        "INVALID_PARAMS",
        "INVALID_PARAMS",
        "Params must be a valid object"
      );
    }
  }

  /**
   * Prepare form data (URL encoded)
   */
  prepareformdata(data) {
    if (!data || typeof data !== "object") return "";
    
    return Object.keys(data)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join("&");
  }

  /**
   * Prepare query string
   */
  preparequerystring(query) {
    if (!query || typeof query !== "object") return "";
    
    return Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join("&");
  }

  /**
   * Base64 encode API key
   */
  base64encode(str) {
    return Buffer.from(str).toString("base64");
  }

  /**
   * Generate UUID for request tracking
   */
  generateuuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get logging path
   */
  getloggingpath() {
    return this.gatewayconfig.loggingpath || 
           path.join(__dirname, "../logs/hdfcpaymenthandler.log");
  }

  /**
   * Get enable logging flag
   */
  getenablelogging() {
    return typeof this.gatewayconfig.enablelogging === "boolean"
      ? this.gatewayconfig.enablelogging
      : true;
  }

  /**
   * Get API version
   */
  getversion() {
    return "2024-06-24";
  }

  /**
   * Validate HMAC signature (static method for callback verification)
   */
  static validatehmacsignature(params, secretkey) {
    if (typeof params !== "object" || typeof secretkey !== "string") {
      throw new TypeError(
        `params should be object, secretkey should be string`
      );
    }

    // Extract all params except signature
    const paramslist = {};
    for (const key in params) {
      if (key !== "signature" && key !== "signature_algorithm") {
        paramslist[key] = params[key];
      }
    }

    // Sort params by keys
    const sortedparams = this.sortobjectbykeys(paramslist);
    
    // Create params string
    let paramsstring = "";
    for (const key in sortedparams) {
      paramsstring += `${key}=${sortedparams[key]}&`;
    }
    
    // Remove trailing &
    paramsstring = paramsstring.substring(0, paramsstring.length - 1);
    
    // Encode params
    const encodedparams = encodeURIComponent(paramsstring);

    // Calculate HMAC
    const computedhmac = crypto
      .createHmac("sha256", secretkey)
      .update(encodedparams)
      .digest("base64");

    const receivedhmac = decodeURIComponent(params.signature);

    return decodeURIComponent(computedhmac) === receivedhmac;
  }

  /**
   * Sort object by keys (static method)
   */
  static sortobjectbykeys(obj) {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {});
  }
}

/**
 * HDFCAPIException - Custom error class for HDFC API errors
 */
class HDFCAPIException extends Error {
  constructor(httpresponsecode, status, errorcode, errormessage) {
    super(errormessage || errorcode || "Something went wrong");
    this.name = "HDFCAPIException";
    this.httpresponsecode = httpresponsecode;
    this.status = status;
    this.errorcode = errorcode;
    this.errormessage = errormessage;
  }
}

module.exports = {
  HDFCPaymentHandler,
  SimpleLogger,
  HDFCAPIException,
};
