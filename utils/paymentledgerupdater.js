const Ledgerstud = require('../Models/ledgerstud');

async function updateLedgerAfterPayment({ ledgerid, amount, gatewayname }) {
  try {
    if (!ledgerid) {
      console.log('[PaymentLedgerUpdater] No ledgerid provided, skipping ledger update.');
      return null;
    }

    const ledger = await Ledgerstud.findById(ledgerid);
    if (!ledger) {
      console.error(`[PaymentLedgerUpdater] Ledger entry not found for id: ${ledgerid}`);
      return null;
    }

    const paidAmount = Number(amount);
    if (isNaN(paidAmount) || paidAmount <= 0) {
      console.error(`[PaymentLedgerUpdater] Invalid payment amount: ${amount}`);
      return null;
    }

    // Update paid amount
    ledger.paid = (Number(ledger.paid) || 0) + paidAmount;

    // Recalculate balance: amount - paid - concession
    const totalAmount = Number(ledger.amount) || 0;
    ledger.balance = Math.max(0, totalAmount - ledger.paid);

    // Update payment gateway amount
    ledger.pg = (Number(ledger.pg) || 0) + paidAmount;

    // Set pay mode
    ledger.paymode = "PG";

    // Set paid date
    ledger.paiddate = new Date();

    // Update status if fully paid
    if (ledger.balance <= 0) {
      ledger.status = "paid";
    }

    await ledger.save();

    console.log(`[PaymentLedgerUpdater] Ledger updated successfully. ID: ${ledgerid}, Gateway: ${gatewayname}, Paid: ${paidAmount}, New Balance: ${ledger.balance}`);

    return ledger;
  } catch (err) {
    console.error(`[PaymentLedgerUpdater] Error updating ledger: ${err.message}`);
    return null;
  }
}

module.exports = { updateLedgerAfterPayment };
