// src/models/Referral.js
import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hasTriggeredInitialBonus: {
      type: Boolean,
      default: false, // Tracks if referrer already got the 50% initial deposit yield bonus
    },
    isPassiveEligible: {
      type: Boolean,
      default: false, // True when referred user's active balance is >= $300
    },
    totalEarnedFromUser: {
      type: Number,
      default: 0, // Aggregate earned rewards from this specific referral link
    },
  },
  {
    timestamps: true,
  }
);

const Referral = mongoose.model('Referral', referralSchema);
export default Referral;