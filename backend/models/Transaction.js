const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planType: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number, required: true },
    utrNumber: { type: String, required: true },
    paymentMethod: { type: String, default: 'upi' },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
