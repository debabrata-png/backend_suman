const omniwaregatewayds = require('../Models/omniwaregatewayds');
const universalpaymentgatewayds = require('../Models/universalpaymentgatewayds');
const OmniwarePaymentHandler = require('../utils/omniwaregatewayhandler');

// @desc    Create Omniware Config
// @route   POST /api/v2/omniwaregatewayds/create
exports.createOmniwareConfig = async (req, res) => {
  try {
    const config = await omniwaregatewayds.create(req.body);
    res.status(201).json({
      success: true,
      data: config
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get Omniware Config by colid
// @route   POST /api/v2/omniwaregatewayds/get
exports.getOmniwareConfig = async (req, res) => {
  try {
    const { colid } = req.body;
    const config = await omniwaregatewayds.findOne({ colid, isactive: true });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Update Omniware Config
// @route   POST /api/v2/omniwaregatewayds/update
exports.updateOmniwareConfig = async (req, res) => {
  try {
    const { id } = req.query;
    const config = await omniwaregatewayds.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Initiate Omniware Payment
 * @route   POST /api/v2/omniware/initiate
 */
exports.initiateOmniwarePayment = async (req, res) => {
  try {
    const {
      colid,
      studentname,
      regno,
      amount,
      accountno,
      paymenttype,
      paymentpurpose,
      email,
      phone,
      address_line_1,
      city,
      state,
      zip_code,
      country,
      type,
      ledgerid,
      ledgerbalance,
      feegroup,
      feeitem,
      feecategory,
      semester,
      installment,
      academicyear,
      classdate,
      ledgerdetails,
      frontendcallbackurl
    } = req.body;

    if (!colid) throw new Error('colid is required');

    // 1. Fetch Credentials
    const config = await omniwaregatewayds.findOne({ colid, isactive: true });
    if (!config) throw new Error(`Omniware configuration not found for college ID: ${colid}`);

    const handler = new OmniwarePaymentHandler({
      apiKey: config.apikey,
      salt: config.salt,
      env: config.environment
    });

    // 2. Generate Order ID
    const order_id = `OMN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 3. Prepare Omniware Params
      const protocol = req.protocol;
      const host = req.get('host');
      const return_url = `${protocol}://${host}/api/v2/omniwaregatewayds/callback`;

      const omniwareParams = {
        api_key: handler.apiKey,
        order_id: order_id,
        amount: parseFloat(amount).toFixed(2),
        currency: 'INR',
        description: paymentpurpose || 'Fees Payment',
        name: studentname,
        email: email,
        phone: (phone || '').toString().replace(/\D/g, '').slice(-10),
        address_line_1: address_line_1 || 'N/A',
        city: city || 'Bhopal',
        state: state || 'MP',
        zip_code: zip_code || '462001',
        country: country || 'IND',
        mode: config.environment === 'prod' ? 'LIVE' : 'TEST',
        return_url: return_url,
        udf1: 'Omniware',
        udf2: accountno || '',
        udf3: regno || '',
        udf4: paymenttype || ''
      };

    // 4. Generate Hash
    const hash = handler.generateHash(omniwareParams);
    omniwareParams.hash = hash;

    // 5. Create History Record
    await universalpaymentgatewayds.create({
      name: studentname,
      user: req.body.user || 'STUDENT',
      colid,
      studentname,
      regno,
      studentemail: email,
      studentphone: phone,
      orderid: order_id,
      txnid: order_id, // Same as order_id for Omniware
      amount,
      gatewayname: 'Omniware',
      accountno,
      paymenttype,
      paymentpurpose,
      type,
      ledgerid,
      ledgerbalance,
      feegroup,
      feeitem,
      feecategory,
      semester,
      installment,
      academicyear,
      classdate,
      ledgerdetails,
      status: 'INITIATED',
      frontendcallbackurl: frontendcallbackurl
    });

    // 6. Return Initiation Data
    res.status(200).json({
      success: true,
      data: {
        payment_params: omniwareParams,
        payment_url: handler.baseUrl
      }
    });

  } catch (err) {
    console.error('Omniware Initiation Error:', err);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Omniware Callback Handler
 * @route   POST /api/v2/omniware/callback
 */
exports.handleOmniwareCallback = async (req, res) => {
  try {
    const params = req.body;
    const { order_id, response_code, response_message } = params;

    // 1. Find Transaction
    const history = await universalpaymentgatewayds.findOne({ orderid: order_id });
    if (!history) throw new Error('Transaction not found');

    // 2. Fetch Config for Hash Verification
    const config = await omniwaregatewayds.findOne({ colid: history.colid });
    if (!config) throw new Error('Omniware configuration not found for verification');

    const handler = new OmniwarePaymentHandler({
      apiKey: config.apikey,
      salt: config.salt,
      env: config.environment
    });

    // 3. Verify Hash
    if (!handler.verifyResponseHash(params)) {
      throw new Error('Hash verification failed');
    }

    // 4. Update History
    history.status = (response_code === '0' || response_code === 0) ? 'SUCCESS' : 'FAILED';
    history.txnid = params.transaction_id;
    history.gatewayresponse = params;
    history.completedat = new Date();
    await history.save();

    // 5. Redirect back to frontend
    const frontendUrl = history.frontendcallbackurl || `${process.env.FRONTEND_URL}/payment-status`;
    const redirectUrl = `${frontendUrl}?orderid=${order_id}&txnid=${params.transaction_id || order_id}&status=${history.status}&msg=${encodeURIComponent(response_message)}`;

    res.redirect(redirectUrl);

  } catch (err) {
    console.error('Omniware Callback Error:', err);
    const redirectUrl = `${process.env.FRONTEND_URL}/payment-error?message=${encodeURIComponent(err.message)}`;
    res.redirect(redirectUrl);
  }
};
