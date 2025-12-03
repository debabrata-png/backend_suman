const paymentorderds = require('../Models/paymentorderds');
const paymentgatewayds = require('../Models/paymentgatewayds');
const platformchargesds = require('../Models/platformchargesds');
const Coupon = require('../Models/couponds');
const Ledgerstud = require('../Models/ledgerstud');

// Create payment order and return configuration
exports.createpaymentorderdsdatabyds = async (req, res) => {
  try {
    const {
      name, user, colid, studentName, regno, studentEmail, studentPhone,
      originalAmount, paymentType, paymentPurpose, academicYear, semester,
      course, department, programcode, admissionyear, couponCode,
      feegroup, feeitem, feecategory, installment, redirectUrl, comments, notes
    } = req.body;

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
      platformCharges = 0;
    }

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
        discount = 0;
      }
    }

    const finalAmount = Math.round(originalAmount - discount + platformCharges);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const orderId = `ORD_${colid}_${timestamp}_${randomStr}`;
    const merchantTransactionId = `TXN_${colid}_${timestamp}_${randomStr}`;

    const baseCallbackUrl = redirectUrl || 'http://localhost:5173/paymentcallbackds';
    const callbackUrlBase = baseCallbackUrl.split('?')[0];
    const yourCallbackUrl = `${callbackUrlBase}?merchantOrderId=${orderId}&colid=${colid}`;

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

    if (couponApplied && couponId) {
      try {
        const coupon = await Coupon.findById(couponId);
        await coupon.applyCoupon(studentName, regno, newOrder.orderid, discount);
      } catch (err) {
        // Continue
      }
    }

    const payload = {
      merchantOrderId: orderId,
      amount: finalAmount * 100,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: paymentPurpose || "Fee Payment",
        merchantUrls: {
          redirectUrl: yourCallbackUrl
        }
      }
    };

    const phonepeUrl = gatewayConfig.environment === 'UAT'
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay'
      : 'https://api.phonepe.com/apis/pg/checkout/v2/pay';

    const phonepeHeaders = {
      'Content-Type': 'application/json',
      'X-MERCHANT-ID': gatewayConfig.marchentid,
      'X-SOURCE': 'API',
      'X-SOURCE-PLATFORM': 'AIPATHSHALA',
      'X-SOURCE-CHANNEL': 'web',
      'X-SOURCE-REDIRECTION-TYPE': 'PARTNER_REDIRECTION'
    };

    const authConfig = gatewayConfig.isTSP ? {
      authUrl: gatewayConfig.environment === 'UAT'
        ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
        : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
      clientId: gatewayConfig.tspClientId,
      clientSecret: gatewayConfig.tspClientSecret,
      clientVersion: gatewayConfig.tspClientVersion || '1'
    } : null;

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId,
        merchantTransactionId,
        originalAmount,
        discount,
        platformCharges,
        finalAmount,
        order: newOrder,
        phonepe: {
          url: phonepeUrl,
          headers: phonepeHeaders,
          payload: payload,
          authConfig: authConfig,
          environment: gatewayConfig.environment
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment order',
      error: error.message
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment orders',
      error: error.message
    });
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
      
      if (!order.ledgerEntryCreated) {
        try {
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
          // Continue
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
    res.status(500).json({
      success: false,
      message: 'Failed to update payment order',
      error: error.message
    });
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
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment order',
      error: error.message
    });
  }
};

// Get status check configuration
exports.checkpaymentstatusbyds = async (req, res) => {
  try {
    const { merchantTransactionId, merchantOrderId, colid } = req.query;

    const orderId = merchantOrderId || merchantTransactionId;

    if (!orderId || !colid) {
      return res.status(400).json({
        success: false,
        message: 'merchantOrderId (or merchantTransactionId) and colid are required'
      });
    }

    const order = await paymentorderds.findOne({ 
      $or: [{ orderid: orderId }, { merchantTransactionId: orderId }] 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found'
      });
    }

    const gatewayConfig = await paymentgatewayds.findOne({ colid: order.colid, isActive: true });
    if (!gatewayConfig) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway not configured'
      });
    }

    const statusUrl = gatewayConfig.environment === 'UAT'
      ? `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${order.orderid}/status?details=false`
      : `https://api.phonepe.com/apis/pg/checkout/v2/order/${order.orderid}/status?details=false`;

    const headers = {
      'Content-Type': 'application/json',
      'X-MERCHANT-ID': gatewayConfig.marchentid
    };

    const authConfig = gatewayConfig.isTSP ? {
      authUrl: gatewayConfig.environment === 'UAT'
        ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
        : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
      clientId: gatewayConfig.tspClientId,
      clientSecret: gatewayConfig.tspClientSecret,
      clientVersion: gatewayConfig.tspClientVersion || '1'
    } : null;

    res.status(200).json({
      success: true,
      data: {
        statusUrl,
        headers,
        authConfig,
        order
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
};

// Webhook handler
exports.webhookhandler = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data'
      });
    }

    const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));

    const { merchantTransactionId, merchantOrderId, transactionId, code, paymentInstrument } = decodedResponse;

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
        
        if (!order.ledgerEntryCreated) {
          try {
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
            // Continue
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
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};
