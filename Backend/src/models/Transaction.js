// src/models/Transaction.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'DEPOSIT',
        'DAILY_YIELD',
        'REFERRAL_DIRECT_BONUS',
        'REFERRAL_DAILY_PASSIVE',
        'WITHDRAWAL_REQUEST',
        'WITHDRAWAL_APPROVED',
        'WITHDRAWAL_REJECTED',
        'PLATFORM_FEE',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    netAmount: {
      type: Number,
      default: 0, // Amount received after deducting 20% platform fee on withdrawals
    },
    feeDeducted: {
      type: Number,
      default: 0, // Calculated 20% fee amount
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
    },
    merchantTradeNo: {
      type: String,
      default: null, // Binance Pay Order/Trade ID
    },
    txHash: {
      type: String,
      default: null, // On-chain blockchain TxID or reference ID
    },
    paymentMethod: {
      type: String,
      default: 'BINANCE_PAY',
    },
    paymentProofUrl: {
      type: String,
      default: null, // Cloudinary Image URL for manual deposit transfer proof
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;