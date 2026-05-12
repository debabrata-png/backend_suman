const ChallanConfig = require('../Models/challanconfig');
const mfeescol = require('../Models/mfeescol');
const ledgerstud = require('../Models/ledgerstud');
const ChallanTemplate = require('../Models/challantemplateds');

exports.getchallanconfig = async (req, res) => {
  try {
    const config = await ChallanConfig.find({ colid: parseInt(req.query.colid) });
    return res.status(200).json({
      status: 'Success',
      data: config
    });
  } catch (err) {
    return res.status(400).json({ status: 'Failed', message: err.message });
  }
};

exports.savechallanconfig = async (req, res) => {
  try {
    const { colid, configName, bankName, accountNo, branch, institutionName, address, session, logo } = req.body;
    const config = await ChallanConfig.findOneAndUpdate(
      { colid: parseInt(colid), configName },
      { bankName, accountNo, branch, institutionName, address, session, logo },
      { upsert: true, new: true }
    );
    return res.status(200).json({
      status: 'Success',
      data: config
    });
  } catch (err) {
    return res.status(400).json({ status: 'Failed', message: err.message });
  }
};

exports.generatechallanpayment = async (req, res) => {
  try {
    const {
      colid, user, year, programcode, student, regno,
      feegroup, feeitem, semester, feecategory,
      amount, paymode, payref, paystatus,
      ledgerId, balance, name, doclink, paydetails, installment, status,
      paiddate
    } = req.body;

    // 1. Create fee collection record
    await mfeescol.create({
      name, colid, user, year, programcode, student, regno,
      feegroup, feeitem, semester, feecategory,
      paydate: paiddate || new Date(),
      amount, paystatus: paystatus || 'Submitted',
      paymode: paymode || 'Challan',
      payref, status1: 'Submitted', comments: 'Challan Generated'
    });

    // 2. Update student ledger
    // Only set Status to 'Paid' if the balance is fully cleared, otherwise keep as 'Active'
    const finalStatus = Number(balance) <= 0 ? 'Paid' : 'Active';

    await ledgerstud.findByIdAndUpdate(ledgerId, {
      paiddate: paiddate || new Date(),
      paid: amount,
      balance: balance,
      paymode: paymode || 'Challan',
      paydetails: paydetails || 'Challan Generated',
      installment,
      status: finalStatus,
      doclink,
      status1: 'Submitted',
      comments: 'Challan Generated'
    });

    return res.status(200).json({
      status: 'Success'
    });
  } catch (err) {
    return res.status(400).json({ status: 'Failed', message: err.message });
  }
};

// --- Template Management ---

exports.getChallanTemplate = async (req, res) => {
  try {
    const { colid, configName } = req.query;
    const template = await ChallanTemplate.findOne({ colid: parseInt(colid), configName });
    return res.status(200).json({
      status: 'Success',
      data: template
    });
  } catch (err) {
    return res.status(400).json({ status: 'Failed', message: err.message });
  }
};

exports.saveChallanTemplate = async (req, res) => {
  try {
    const { colid, configName, templateHtml, orientation, copies } = req.body;
    const template = await ChallanTemplate.findOneAndUpdate(
      { colid: parseInt(colid), configName },
      { templateHtml, orientation, copies },
      { upsert: true, new: true }
    );
    return res.status(200).json({
      status: 'Success',
      data: template
    });
  } catch (err) {
    return res.status(400).json({ status: 'Failed', message: err.message });
  }
};
