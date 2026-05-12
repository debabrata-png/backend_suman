const paymentorderds = require('../Models/paymentorderds');
const paymentgatewayds = require('../Models/paymentgatewayds');
const platformchargesds = require('../Models/platformchargesds');
const Coupon = require('../Models/couponds');
const crypto = require('crypto');

// Helper to get PhonePe Auth Token (TSP V2)
const getPhonePeAuthToken = async (gatewayConfig) => {
  try {
    // URL from Postman collection for UAT
    const authUrl = gatewayConfig.environment === 'UAT'
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
      : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';

    const params = new URLSearchParams();
    params.append('client_id', gatewayConfig.tspClientId);
    params.append('client_version', gatewayConfig.tspClientVersion || '1');
    params.append('client_secret', gatewayConfig.tspClientSecret);
    params.append('grant_type', 'client_credentials');

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.access_token) {
      return data;
    } else {
      throw new Error('No access token received');
    }

  } catch (error) {
    console.error('Error getting auth token:', error.message);
    throw error;
  }
};

// Create payment order
exports.createpaymentorderdsdatabyds = async (req, res) => {
  try {
    const {
      name, user, colid, studentName, regno, studentEmail, studentPhone,
      originalAmount, paymentType, paymentPurpose, academicYear, semester,
      course, department, programcode, admissionyear, couponCode,
      feegroup, feeitem, feecategory, installment, redirectUrl, comments, notes
    } = req.body;



    // Parse amount to ensure it's a number
    const parsedAmount = parseFloat(originalAmount);
    if (isNaN(parsedAmount)) {

      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    if (!studentName || !regno || !studentEmail || !studentPhone || !originalAmount) {

      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const gatewayConfig = await paymentgatewayds.findOne({ colid, isActive: true });
    if (!gatewayConfig) {

      return res.status(404).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }


    // Get platform charges
    let platformCharges = 0;
    try {
      const chargesConfig = await platformchargesds.findOne({ colid, isActive: true });
      if (chargesConfig) {
        const baseCharge = chargesConfig.chargetype === 'Fixed'
          ? chargesConfig.fixedcharge
          : (originalAmount * chargesConfig.percentagecharge / 100);

        const finalCharge = Math.max(
          chargesConfig.minimumcharge || 0,
          Math.min(baseCharge, chargesConfig.maximumcharge || baseCharge)
        );

        platformCharges = chargesConfig.gstApplicable
          ? finalCharge + (finalCharge * chargesConfig.gstPercentage / 100)
          : finalCharge;
      }
    } catch (err) {
      // console.log('Platform charges not configured');
    }

    // Handle coupon
    let discount = 0;
    let couponId = null;
    let couponApplied = false;

    if (couponCode) {
      try {
        const coupon = await Coupon.findOne({
          couponCode: couponCode.toUpperCase(),
          colid
        });

        if (coupon) {
          const studentInfo = { course, department, semester, programcode };
          const validation = coupon.validateCoupon(regno, originalAmount, paymentType, studentInfo);

          if (validation.valid) {
            discount = coupon.calculateDiscount(originalAmount);
            couponId = coupon._id.toString();
            couponApplied = true;
          }
        }
      } catch (err) {
        // console.log('Coupon validation failed:', err);
      }
    }

    const finalAmount = Math.round(parsedAmount - discount + platformCharges);


    // Generate unique IDs
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const orderId = `ORD_${colid}_${timestamp}_${randomStr}`;
    const merchantTransactionId = `TXN_${colid}_${timestamp}_${randomStr}`;

    // Construct callback URL with params
    const baseCallbackUrl = redirectUrl || 'http://localhost:5173/paymentcallbackds';
    const callbackUrlBase = baseCallbackUrl.split('?')[0];
    const yourCallbackUrl = `${callbackUrlBase}?merchantOrderId=${orderId}&colid=${colid}`;

    // Create payment order
    const newOrder = new paymentorderds({
      name: name || 'Payment Gateway',
      user: user || studentEmail,
      colid,
      student: studentName,
      regno,
      studentemail: studentEmail,
      studentphone: studentPhone,
      orderid: orderId,
      merchantTransactionId,
      originalAmount,
      discount,
      platformCharges,
      amount: finalAmount,
      paymentType: paymentType || 'OTHER',
      paymentPurpose: paymentPurpose || 'Fee Payment',
      academicYear,
      semester,
      course,
      department,
      programcode,
      admissionyear,
      couponApplied,
      couponCode: couponApplied ? couponCode.toUpperCase() : null,
      couponId,
      status: 'INITIATED',
      initiatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      redirectUrl: yourCallbackUrl,
      callbackUrl: gatewayConfig.callbackurl,
      feegroup,
      feeitem,
      feecategory,
      installment,
      comments,
      notes
    });

    await newOrder.save();

    // Apply coupon
    if (couponApplied && couponId) {
      try {
        const coupon = await Coupon.findById(couponId);
        await coupon.applyCoupon(studentName, regno, newOrder.orderid, discount);
      } catch (err) {
        // console.log('Coupon apply failed:', err);
      }
    }

    // Prepare PhonePe V2 payment request
    const payload = {
      merchantOrderId: merchantTransactionId,
      amount: finalAmount * 100, // Amount in paise
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for ${paymentPurpose || 'Fee'}`,
        merchantUrls: {
          redirectUrl: yourCallbackUrl,
          redirectMode: "REDIRECT" // Explicitly setting redirect mode if supported/needed
        }
      }
    };

    const phonepeUrl = gatewayConfig.environment === 'UAT'
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay'
      : 'https://api.phonepe.com/apis/pg/checkout/v2/pay';

    let phonepeHeaders = {
      'Content-Type': 'application/json'
    };

    // Get TSP auth token if needed
    if (gatewayConfig.isTSP && gatewayConfig.tspClientId && gatewayConfig.tspClientSecret) {
      try {
        const authResponse = await getPhonePeAuthToken(gatewayConfig);
        // Important: V2 TSP uses "O-Bearer" prefix
        phonepeHeaders['Authorization'] = `O-Bearer ${authResponse.access_token}`;
        phonepeHeaders['X-MERCHANT-ID'] = gatewayConfig.marchentid;

        // Add other mandatory TSP headers
        phonepeHeaders['X-SOURCE'] = 'API';
        phonepeHeaders['X-SOURCE-PLATFORM'] = 'PARTNERNAME'; // Should be dynamic if possible, or fixed as per partner agreement
        phonepeHeaders['X-SOURCE-REDIRECTION-TYPE'] = 'PARTNER_REDIRECTION';
        phonepeHeaders['X-SOURCE-CHANNEL'] = 'web';

        // Mandatory headers for TSP V2
        phonepeHeaders['X-MERCHANT-DOMAIN'] = 'https://www.epaathsala.com'; // Required: Merchant's domain
        phonepeHeaders['X-MERCHANT-IP'] = '127.0.0.1'; // Required: Merchant's IP

        // phonepeHeaders['X-BROWSER-FINGERPRINT'] = '...'; // Optional but recommended

      } catch (authError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to authenticate with PhonePe',
          error: authError.message
        });
      }
    } else {
      // Fallback for non-TSP (V1 flow) - NOT IMPLEMENTED HERE as we are focusing on V2 TSP
      return res.status(400).json({
        success: false,
        message: 'Only TSP V2 flow is currently supported in this refactor'
      });
    }

    try {


      const phonepeResponse = await fetch(phonepeUrl, {
        method: 'POST',
        headers: phonepeHeaders,
        body: JSON.stringify(payload)
      });

      const phonepeData = await phonepeResponse.json();


      // Check for success based on V2 response structure
      // V2 usually returns { state: "PENDING" | "COMPLETED", data: { redirectUrl: "..." } } OR { state: "PENDING", redirectUrl: "..." }
      if (phonepeData.state === 'PENDING' || phonepeData.state === 'COMPLETED' || (phonepeData.data && phonepeData.data.redirectUrl) || phonepeData.redirectUrl) {

        const redirectUrl = phonepeData.redirectUrl || phonepeData.data?.redirectUrl;

        if (redirectUrl) {
          newOrder.phonePeOrderId = phonepeData.orderId || phonepeData.id || phonepeData.data?.merchantTransactionId;
          newOrder.state = 'INITIATED';
          newOrder.phonepePaymentUrl = redirectUrl;
          await newOrder.save();

          res.status(201).json({
            success: true,
            message: 'Payment initiated successfully',
            data: {
              orderId,
              merchantTransactionId,
              originalAmount,
              discount,
              platformCharges,
              finalAmount,
              paymentUrl: redirectUrl,
              order: newOrder
            }
          });
        } else {
          throw new Error('No redirect URL in PhonePe response');
        }

      } else {
        // Handle error
        console.error('PhonePe Error:', phonepeData);
        res.status(400).json({
          success: false,
          message: 'Payment initiation failed',
          error: phonepeData
        });
      }
    } catch (phonepeError) {
      // console.error('PhonePe Request Error:', phonepeError);
      // res.status(500).json({
      //   success: false,
      //   message: 'Failed to initiate payment with PhonePe',
      //   error: phonepeError.message
      // });
    }
  } catch (err) {
    // console.error('Create Order Error:', err);
    // res.status(500).json({
    //   success: false,
    //   message: 'Internal server error',
    //   error: err.message
    // });
  }
};

// Check payment status
exports.checkpaymentstatusbyds = async (req, res) => {
  try {
    const { merchantOrderId, colid } = req.query;

    if (!merchantOrderId || !colid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const order = await paymentorderds.findOne({ orderid: merchantOrderId, colid });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const gatewayConfig = await paymentgatewayds.findOne({ colid, isActive: true });
    if (!gatewayConfig) {
      return res.status(404).json({
        success: false,
        message: 'Gateway config not found'
      });
    }

    const merchantTransactionId = order.merchantTransactionId;

    // V2 Status URL
    const statusUrl = gatewayConfig.environment === 'UAT'
      ? `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${merchantTransactionId}/status?details=false`
      : `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantTransactionId}/status?details=false`;

    let headers = {
      'Content-Type': 'application/json',
      'X-MERCHANT-ID': gatewayConfig.marchentid
    };

    // If TSP, add auth token
    if (gatewayConfig.isTSP && gatewayConfig.tspClientId && gatewayConfig.tspClientSecret) {
      try {
        const authResponse = await getPhonePeAuthToken(gatewayConfig);
        headers['Authorization'] = `O-Bearer ${authResponse.access_token}`;
      } catch (authError) {
        console.error('Auth failed for status check:', authError);
      }
    }

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();


    if (data.state === 'COMPLETED') {
      order.status = 'SUCCESS';
      order.phonePeTransactionId = data.id;
      order.paymentMode = data.paymentInstrument?.type;
      order.paymentDetails = data;
      order.completedAt = new Date();

      // Create ledger entry
      if (!order.ledgerEntryCreated) {
        // Ledger logic would go here
      }
    } else if (data.state === 'FAILED') {
      order.status = 'FAILED';
      order.errorDetails = data;
      order.failedAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        status: order.status,
        details: data
      }
    });

  } catch (error) {
    // console.error('Check Status Error:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to check payment status',
    //   error: error.message
    // });
  }
};

// Get payment order
exports.getpaymentorderdsdatabyds = async (req, res) => {
  try {
    params.append('client_version', gatewayConfig.tspClientVersion || '1');
    params.append('client_secret', gatewayConfig.tspClientSecret);
    params.append('grant_type', 'client_credentials');

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.access_token) {
      return data;
    } else {
      throw new Error('No access token received');
    }

  } catch (error) {
    // console.error('Error getting auth token:', error.message);
    // throw error;
  }
};

// Create payment order
exports.createpaymentorderdsdatabyds = async (req, res) => {
  try {
    const {
      name, user, colid, studentName, regno, studentEmail, studentPhone,
      originalAmount, paymentType, paymentPurpose, academicYear, semester,
      course, department, programcode, admissionyear, couponCode,
      feegroup, feeitem, feecategory, installment, redirectUrl, comments, notes
    } = req.body;



    // Parse amount to ensure it's a number
    const parsedAmount = parseFloat(originalAmount);
    if (isNaN(parsedAmount)) {

      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    if (!studentName || !regno || !studentEmail || !studentPhone || !originalAmount) {

      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const gatewayConfig = await paymentgatewayds.findOne({ colid, isActive: true });
    if (!gatewayConfig) {

      return res.status(404).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }


    // Get platform charges
    let platformCharges = 0;
    try {
      const chargesConfig = await platformchargesds.findOne({ colid, isActive: true });
      if (chargesConfig) {
        const baseCharge = chargesConfig.chargetype === 'Fixed'
          ? chargesConfig.fixedcharge
          : (originalAmount * chargesConfig.percentagecharge / 100);

        const finalCharge = Math.max(
          chargesConfig.minimumcharge || 0,
          Math.min(baseCharge, chargesConfig.maximumcharge || baseCharge)
        );

        platformCharges = chargesConfig.gstApplicable
          ? finalCharge + (finalCharge * chargesConfig.gstPercentage / 100)
          : finalCharge;
      }
    } catch (err) {
      // console.log('Platform charges not configured');
    }

    // Handle coupon
    let discount = 0;
    let couponId = null;
    let couponApplied = false;

    if (couponCode) {
      try {
        const coupon = await Coupon.findOne({
          couponCode: couponCode.toUpperCase(),
          colid
        });

        if (coupon) {
          const studentInfo = { course, department, semester, programcode };
          const validation = coupon.validateCoupon(regno, originalAmount, paymentType, studentInfo);

          if (validation.valid) {
            discount = coupon.calculateDiscount(originalAmount);
            couponId = coupon._id.toString();
            couponApplied = true;
          }
        }
      } catch (err) {
        // console.log('Coupon validation failed:', err);
      }
    }

    const finalAmount = Math.round(parsedAmount - discount + platformCharges);


    // Generate unique IDs
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const orderId = `ORD_${colid}_${timestamp}_${randomStr}`;
    const merchantTransactionId = `TXN_${colid}_${timestamp}_${randomStr}`;

    // Construct callback URL with params
    const baseCallbackUrl = redirectUrl || 'http://localhost:5173/paymentcallbackds';
    const callbackUrlBase = baseCallbackUrl.split('?')[0];
    const yourCallbackUrl = `${callbackUrlBase}?merchantOrderId=${orderId}&colid=${colid}`;

    // Create payment order
    const newOrder = new paymentorderds({
      name: name || 'Payment Gateway',
      user: user || studentEmail,
      colid,
      student: studentName,
      regno,
      studentemail: studentEmail,
      studentphone: studentPhone,
      orderid: orderId,
      merchantTransactionId,
      originalAmount,
      discount,
      platformCharges,
      amount: finalAmount,
      paymentType: paymentType || 'OTHER',
      paymentPurpose: paymentPurpose || 'Fee Payment',
      academicYear,
      semester,
      course,
      department,
      programcode,
      admissionyear,
      couponApplied,
      couponCode: couponApplied ? couponCode.toUpperCase() : null,
      couponId,
      status: 'INITIATED',
      initiatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      redirectUrl: yourCallbackUrl,
      callbackUrl: gatewayConfig.callbackurl,
      feegroup,
      feeitem,
      feecategory,
      installment,
      comments,
      notes
    });

    await newOrder.save();

    // Apply coupon
    if (couponApplied && couponId) {
      try {
        const coupon = await Coupon.findById(couponId);
        await coupon.applyCoupon(studentName, regno, newOrder.orderid, discount);
      } catch (err) {
        // console.log('Coupon apply failed:', err);
      }
    }

    // Prepare PhonePe V2 payment request
    const payload = {
      merchantOrderId: merchantTransactionId,
      amount: finalAmount * 100, // Amount in paise
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for ${paymentPurpose || 'Fee'}`,
        merchantUrls: {
          redirectUrl: yourCallbackUrl,
          redirectMode: "REDIRECT" // Explicitly setting redirect mode if supported/needed
        }
      }
    };

    const phonepeUrl = gatewayConfig.environment === 'UAT'
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay'
      : 'https://api.phonepe.com/apis/pg/checkout/v2/pay';

    let phonepeHeaders = {
      'Content-Type': 'application/json'
    };

    // Get TSP auth token if needed
    if (gatewayConfig.isTSP && gatewayConfig.tspClientId && gatewayConfig.tspClientSecret) {
      try {
        const authResponse = await getPhonePeAuthToken(gatewayConfig);
        // Important: V2 TSP uses "O-Bearer" prefix
        phonepeHeaders['Authorization'] = `O-Bearer ${authResponse.access_token}`;
        phonepeHeaders['X-MERCHANT-ID'] = gatewayConfig.marchentid;

        // Add other mandatory TSP headers
        phonepeHeaders['X-SOURCE'] = 'API';
        phonepeHeaders['X-SOURCE-PLATFORM'] = 'PARTNERNAME'; // Should be dynamic if possible, or fixed as per partner agreement
        phonepeHeaders['X-SOURCE-REDIRECTION-TYPE'] = 'PARTNER_REDIRECTION';
        phonepeHeaders['X-SOURCE-CHANNEL'] = 'web';

        // Mandatory headers for TSP V2
        phonepeHeaders['X-MERCHANT-DOMAIN'] = 'https://www.epaathsala.com'; // Required: Merchant's domain
        phonepeHeaders['X-MERCHANT-IP'] = '127.0.0.1'; // Required: Merchant's IP

        // phonepeHeaders['X-BROWSER-FINGERPRINT'] = '...'; // Optional but recommended

      } catch (authError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to authenticate with PhonePe',
          error: authError.message
        });
      }
    } else {
      // Fallback for non-TSP (V1 flow) - NOT IMPLEMENTED HERE as we are focusing on V2 TSP
      return res.status(400).json({
        success: false,
        message: 'Only TSP V2 flow is currently supported in this refactor'
      });
    }

    try {


      const phonepeResponse = await fetch(phonepeUrl, {
        method: 'POST',
        headers: phonepeHeaders,
        body: JSON.stringify(payload)
      });

      const phonepeData = await phonepeResponse.json();


      // Check for success based on V2 response structure
      // V2 usually returns { state: "PENDING" | "COMPLETED", data: { redirectUrl: "..." } } OR { state: "PENDING", redirectUrl: "..." }
      if (phonepeData.state === 'PENDING' || phonepeData.state === 'COMPLETED' || (phonepeData.data && phonepeData.data.redirectUrl) || phonepeData.redirectUrl) {

        const redirectUrl = phonepeData.redirectUrl || phonepeData.data?.redirectUrl;

        if (redirectUrl) {
          newOrder.phonePeOrderId = phonepeData.orderId || phonepeData.id || phonepeData.data?.merchantTransactionId;
          newOrder.state = 'INITIATED';
          newOrder.phonepePaymentUrl = redirectUrl;
          await newOrder.save();

          res.status(201).json({
            success: true,
            message: 'Payment initiated successfully',
            data: {
              orderId,
              merchantTransactionId,
              originalAmount,
              discount,
              platformCharges,
              finalAmount,
              paymentUrl: redirectUrl,
              order: newOrder
            }
          });
        } else {
          throw new Error('No redirect URL in PhonePe response');
        }

      } else {
        // Handle error
        console.error('PhonePe Error:', phonepeData);
        res.status(400).json({
          success: false,
          message: 'Payment initiation failed',
          error: phonepeData
        });
      }
    } catch (phonepeError) {
      // console.error('PhonePe Request Error:', phonepeError);
      // res.status(500).json({
      //   success: false,
      //   message: 'Failed to initiate payment with PhonePe',
      //   error: phonepeError.message
      // });
    }
  } catch (err) {
    // console.error('Create Order Error:', err);
    // res.status(500).json({
    //   success: false,
    //   message: 'Internal server error',
    //   error: err.message
    // });
  }
};

// Check payment status
exports.checkpaymentstatusbyds = async (req, res) => {
  try {
    const { merchantOrderId, colid } = req.query;

    if (!merchantOrderId || !colid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const order = await paymentorderds.findOne({ orderid: merchantOrderId, colid });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const gatewayConfig = await paymentgatewayds.findOne({ colid, isActive: true });
    if (!gatewayConfig) {
      return res.status(404).json({
        success: false,
        message: 'Gateway config not found'
      });
    }

    const merchantTransactionId = order.merchantTransactionId;

    // V2 Status URL
    const statusUrl = gatewayConfig.environment === 'UAT'
      ? `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${merchantTransactionId}/status?details=false`
      : `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantTransactionId}/status?details=false`;

    let headers = {
      'Content-Type': 'application/json',
      'X-MERCHANT-ID': gatewayConfig.marchentid
    };

    // If TSP, add auth token
    if (gatewayConfig.isTSP && gatewayConfig.tspClientId && gatewayConfig.tspClientSecret) {
      try {
        const authResponse = await getPhonePeAuthToken(gatewayConfig);
        headers['Authorization'] = `O-Bearer ${authResponse.access_token}`;
      } catch (authError) {
        console.error('Auth failed for status check:', authError);
      }
    }

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();


    if (data.state === 'COMPLETED') {
      order.status = 'SUCCESS';
      order.phonePeTransactionId = data.id;
      order.paymentMode = data.paymentInstrument?.type;
      order.paymentDetails = data;
      order.completedAt = new Date();

      // Create ledger entry
      if (!order.ledgerEntryCreated) {
        // Ledger logic would go here
      }
    } else if (data.state === 'FAILED') {
      order.status = 'FAILED';
      order.errorDetails = data;
      order.failedAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        status: order.status,
        details: data
      }
    });

  } catch (error) {
    // console.error('Check Status Error:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to check payment status',
    //   error: error.message
    // });
  }
};

// Get payment order
exports.getpaymentorderdsdatabyds = async (req, res) => {
  try {
    const { orderid, merchantTransactionId } = req.query;

    if (!orderid && !merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'orderid or merchantTransactionId is required'
      });
    }

    const query = orderid ? { orderid } : { merchantTransactionId };
    const order = await paymentorderds.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    // console.error('Error in getpaymentorderdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch payment order',
    //   error: error.message
    // });
  }
};

// Get all payment orders
exports.getallpaymentorderdsdatabyds = async (req, res) => {
  try {
    const { colid, regno, status, paymentType, startDate, endDate } = req.query;

    const query = {};

    if (colid) query.colid = colid;
    if (regno) query.regno = regno;
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await paymentorderds.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    // console.error('Error in getallpaymentorderdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch payment orders',
    //   error: error.message
    // });
  }
};

// Update payment order
exports.updatepaymentorderdsdatabyds = async (req, res) => {
  try {
    const { merchantTransactionId } = req.query;
    const { status, phonePeOrderId, phonePeTransactionId, paymentMode, paymentDetails, errorDetails } = req.body;

    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'merchantTransactionId is required'
      });
    }

    const order = await paymentorderds.findOne({ merchantTransactionId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found'
      });
    }

    if (status) order.status = status;
    if (phonePeOrderId) order.phonePeOrderId = phonePeOrderId;
    if (phonePeTransactionId) order.phonePeTransactionId = phonePeTransactionId;
    if (paymentMode) order.paymentMode = paymentMode;
    if (paymentDetails) order.paymentDetails = paymentDetails;
    if (errorDetails) order.errorDetails = errorDetails;

    if (status === 'SUCCESS') {
      order.completedAt = new Date();

      // Create ledger entry if not already created
      if (!order.ledgerEntryCreated) {
        try {
          // Assuming Ledgerstud is imported or available
          const Ledgerstud = require('../Models/ledgerstud');
          const ledgerEntry = new Ledgerstud({
            name: order.name,
            user: order.user,
            feegroup: order.feegroup || 'Payment Gateway',
            regno: order.regno,
            student: order.student,
            feeitem: order.feeitem || order.paymentPurpose,
            amount: -order.amount,
            paymode: paymentMode || 'Online',
            paydetails: phonePeTransactionId || merchantTransactionId,
            feecategory: order.feecategory || order.paymentType,
            semester: order.semester,
            type: 'CREDIT',
            installment: order.installment,
            comments: order.comments || `Payment via PhonePe - ${merchantTransactionId}`,
            academicyear: order.academicYear,
            colid: order.colid,
            classdate: new Date(),
            status: 'Paid',
            programcode: order.programcode,
            admissionyear: order.admissionyear
          });

          await ledgerEntry.save();
          order.ledgerEntryCreated = true;

        } catch (ledgerError) {
          console.error('Failed to create ledger entry:', ledgerError);
        }
      }
    } else if (status === 'FAILED') {
      order.failedAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment order updated successfully',
      data: order
    });

  } catch (error) {
    // console.error('Error in updatepaymentorderdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to update payment order',
    //   error: error.message
    // });
  }
};

// Delete payment order
exports.deletepaymentorderdsdatabyds = async (req, res) => {
  try {
    const { orderid, merchantTransactionId } = req.query;

    if (!orderid && !merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'orderid or merchantTransactionId is required'
      });
    }

    const query = orderid ? { orderid } : { merchantTransactionId };
    const order = await paymentorderds.findOneAndDelete(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment order deleted successfully'
    });

  } catch (error) {
    // console.error('Error in deletepaymentorderdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to delete payment order',
    //   error: error.message
    // });
  }
};

// Webhook handler for PhonePe callbacks
exports.webhookhandler = async (req, res) => {
  try {


    const { response } = req.body;

    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data'
      });
    }

    // Decode base64 response
    const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));


    const { merchantTransactionId, merchantOrderId, transactionId, amount, code, paymentInstrument } = decodedResponse;

    // Find order by merchantOrderId or merchantTransactionId
    const order = await paymentorderds.findOne({
      $or: [{ orderid: merchantOrderId }, { merchantTransactionId }]
    });

    if (order) {
      if (code === 'PAYMENT_SUCCESS') {
        order.status = 'SUCCESS';
        order.phonePeTransactionId = transactionId;
        order.paymentMode = paymentInstrument?.type;
        order.paymentDetails = decodedResponse;
        order.completedAt = new Date();

        // Create ledger entry
        if (!order.ledgerEntryCreated) {
          try {
            const Ledgerstud = require('../Models/ledgerstud');
            const ledgerEntry = new Ledgerstud({
              name: order.name,
              user: order.user,
              feegroup: order.feegroup || 'Payment Gateway',
              regno: order.regno,
              student: order.student,
              feeitem: order.feeitem || order.paymentPurpose,
              amount: -order.amount,
              paymode: paymentInstrument?.type || 'Online',
              paydetails: transactionId,
              feecategory: order.feecategory || order.paymentType,
              semester: order.semester,
              type: 'CREDIT',
              installment: order.installment,
              comments: `Payment via PhonePe - ${merchantTransactionId || merchantOrderId}`,
              academicyear: order.academicYear,
              colid: order.colid,
              classdate: new Date(),
              status: 'Paid',
              programcode: order.programcode,
              admissionyear: order.admissionyear
            });

            await ledgerEntry.save();
            order.ledgerEntryCreated = true;
          } catch (ledgerError) {
            console.error('Ledger entry creation failed:', ledgerError);
          }
        }
      } else {
        order.status = 'FAILED';
        order.errorDetails = decodedResponse;
        order.failedAt = new Date();
      }

      await order.save();
    }

    res.status(200).json({ success: true });

  } catch (error) {
    // console.error('Webhook error:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Webhook processing failed',
    //   error: error.message
    // });
  }
};
