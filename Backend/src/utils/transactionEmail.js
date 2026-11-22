import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { sendEmail } from '../services/emailService.js';
import { transactionEmailTemplate } from './transactionEmailTemplates.js';

export const sendTransactionEmail = async (transaction, event, knownUser) => {
  try {
    const user = knownUser || await User.findById(transaction.user);
    if (!user?.email) {
      console.error(`Transaction ${transaction._id} ${event} email not sent: user or email missing.`);
      return;
    }
    const message = transactionEmailTemplate(user.name, transaction, event);
    const sent = await sendEmail({ to: user.email, ...message });
    if (!sent) console.error(`Transaction ${transaction._id} ${event} email delivery failed or was skipped.`);
  } catch (error) {
    console.error(`Transaction ${transaction._id} ${event} email error:`, error.message);
  }
};

// This marker only deduplicates email attempts; it does not gate financial resolution.
export const sendResolutionTransactionEmail = async (transaction, event, knownUser) => {
  try {
    const result = await Transaction.updateOne(
      { _id: transaction._id, status: transaction.status, resolutionEmailAttemptedAt: { $exists: false } },
      { $set: { resolutionEmailAttemptedAt: new Date() } },
      { strict: false, timestamps: false }
    );
    if (result.modifiedCount === 1) await sendTransactionEmail(transaction, event, knownUser);
  } catch (error) {
    console.error(`Transaction ${transaction._id} ${event} email could not be scheduled:`, error.message);
  }
};
