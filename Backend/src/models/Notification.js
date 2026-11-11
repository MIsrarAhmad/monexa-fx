import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'DAILY_YIELD',
        'REFERRAL_REWARD',
        'DEPOSIT_PENDING',
        'DEPOSIT_APPROVED',
        'DEPOSIT_REJECTED',
        'WITHDRAWAL_PENDING',
        'WITHDRAWAL_APPROVED',
        'WITHDRAWAL_REJECTED',
        'ANNOUNCEMENT',
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 300 },
    url: { type: String, default: '/dashboard-home', maxlength: 200 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
