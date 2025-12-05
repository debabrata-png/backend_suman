const lawpaymentds = require("../Models/lawpaymentds");
const lawpaymenttransactionds = require("../Models/lawpaymenttransactionds");
const lawformds = require("../Models/lawformds");

exports.createpayment = async (req, res) => {
    try {
        const { colid, caseno, clientname, totalamount, createdby } = req.body;

        const newPayment = new lawpaymentds({
            colid,
            caseno,
            clientname,
            totalamount,
            balanceamount: totalamount,
            createdby
        });

        await newPayment.save();
        res.status(201).json({ success: true, message: "Payment record created successfully", data: newPayment });
    } catch (error) {
        console.error("Error creating payment record:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getallpayments = async (req, res) => {
    try {
        const { colid } = req.query;
        const payments = await lawpaymentds.find({ colid }).sort({ createdat: -1 });
        res.status(200).json({ success: true, data: payments });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.addtransaction = async (req, res) => {
    try {
        const { paymentid, colid, amount, paymentmode, transactionref, notes, createdby } = req.body;

        const payment = await lawpaymentds.findById(paymentid);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

        const newTransaction = new lawpaymenttransactionds({
            paymentid,
            colid,
            amount,
            paymentmode,
            transactionref,
            notes,
            createdby
        });

        await newTransaction.save();

        // Update payment record
        payment.paidamount += parseFloat(amount);
        payment.balanceamount = payment.totalamount - payment.paidamount;

        if (payment.balanceamount <= 0) {
            payment.paymentstatus = 'Paid';
            payment.balanceamount = 0; // Ensure no negative balance
        } else if (payment.paidamount > 0) {
            payment.paymentstatus = 'Partial';
        }

        await payment.save();

        res.status(201).json({ success: true, message: "Transaction added successfully", data: newTransaction });
    } catch (error) {
        console.error("Error adding transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.gettransactionsbypaymentid = async (req, res) => {
    try {
        const { paymentid } = req.query;
        const transactions = await lawpaymenttransactionds.find({ paymentid }).sort({ transactiondate: -1 });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getpaymentreports = async (req, res) => {
    try {
        const { colid, startdate, enddate } = req.query;

        const query = { colid };
        if (startdate && enddate) {
            query.createdat = { $gte: new Date(startdate), $lte: new Date(enddate) };
        }

        const payments = await lawpaymentds.find(query);

        // Calculate totals
        let totalBilled = 0;
        let totalCollected = 0;
        let totalPending = 0;

        payments.forEach(p => {
            totalBilled += p.totalamount;
            totalCollected += p.paidamount;
            totalPending += p.balanceamount;
        });

        res.status(200).json({
            success: true,
            data: {
                payments,
                summary: {
                    totalBilled,
                    totalCollected,
                    totalPending
                }
            }
        });
    } catch (error) {
        console.error("Error fetching payment reports:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
