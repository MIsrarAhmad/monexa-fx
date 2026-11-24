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
    minimumRequiredAtSubmission: {
      type: Number,
      default: null,
    },
    principalAtSubmission: {
      type: Number,
      default: null,
    },
    originalSubmittedAmount: Number,
    depositCorrectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    depositCorrectedAt: Date,
    depositCorrectionReason: { type: String, maxlength: 300 },
    netAmount: {
      type: Number,
      default: 0, // Amount received after deducting 20% platform fee on withdrawals
    },
    feeDeducted: {
      type: Number,
      default: 0, // Calculated 20% fee amount
    },
    reservedProfitBalance: {
      type: Number,
      default: 0,
    },
    reservedReferralBalance: {
      type: Number,
      default: 0,
    },
    reservedMainBalance: {
      type: Number,
      default: 0,
    },
    profitUnlockQualified: {
      type: Boolean,
      default: false,
    },
    profitUnlockReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    profitUnlockReviewedAt: Date,
    profitUnlockReviewReason: {
      type: String,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
    },
    merchantTradeNo: {
      type: String,
      default: null,
    },
    txHash: {
      type: String,
      default: null, // On-chain blockchain TxID or reference ID
    },
    paymentMethod: {
      type: String,
      default: null,
    },
    receiverAddress: {
      type: String,
      default: null,
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

transactionSchema.index({ user: 1, type: 1, createdAt: 1, _id: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;