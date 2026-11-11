// src/models/Wallet.js
import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    mainBalance: {
      type: Number,
      default: 0, // Total active principal deposit balance
    },
    profitBalance: {
      type: Number,
      default: 0, // Accrued daily returns
    },
    unwithdrawnProfitCounter: {
      type: Number,
      default: 0, // Tracks new profit accumulated toward the $50 withdrawal unlock requirement
    },
    referralBalance: {
      type: Number,
      default: 0, // Referral commission earnings
    },
    binancePayId: {
      type: String,
      default: '', // Legacy field retained for existing wallet records
    },
    trc20Address: {
      type: String,
      default: '',
    },
    lastWithdrawalAt: {
      type: Date,
      default: null, // Tracks exact timestamp of the user's most recent withdrawal
    },
    nextYieldAt: {
      type: Date,
      default: null,
    },
    yieldPaused: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;