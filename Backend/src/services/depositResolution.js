import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';
import { getMinimumDepositForBalance } from '../utils/depositRules.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export class DepositResolutionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const validAmount = (value) => {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isSafeInteger(Math.round(amount * 100)) && amount > 0 ? amount : null;
};

export const resolveDeposit = async ({
  transactionId, merchantTradeNo, action, correctedAmount, correctionReason, reviewerId, gatewayAmount,
}) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const query = transactionId ? Transaction.findById(transactionId) : Transaction.findOne({ merchantTradeNo });
      const transaction = await query.session(session);
      if (!transaction || transaction.type !== 'DEPOSIT') {
        throw new DepositResolutionError(404, 'Deposit transaction not found.');
      }
      if (transaction.status !== 'PENDING') {
        const error = new DepositResolutionError(409, `Deposit already ${transaction.status.toLowerCase()}.`);
        error.depositStatus = transaction.status;
        throw error;
      }
      if (action === 'REJECT') {
        transaction.status = 'REJECTED';
        await transaction.save({ session });
        result = { transaction };
        return;
      }

      const wallet = await Wallet.findOne({ user: transaction.user }).session(session);
      if (!wallet) throw new DepositResolutionError(404, 'User wallet record not found.');
      const user = await User.findById(transaction.user).session(session);
      let amount = transaction.amount;
      if (gatewayAmount !== undefined) {
        amount = Number(gatewayAmount);
        if ((typeof gatewayAmount !== 'number' && typeof gatewayAmount !== 'string')
          || !Number.isFinite(amount) || amount <= 0) {
          throw new DepositResolutionError(400, 'Invalid payment amount.');
        }
      } else if (correctedAmount !== undefined) {
        const verifiedAmount = validAmount(correctedAmount);
        if (verifiedAmount === null) {
          throw new DepositResolutionError(400, 'Enter a positive verified amount with at most two decimal places.');
        }
        if (verifiedAmount !== transaction.amount) {
          if (transaction.merchantTradeNo || transaction.paymentMethod !== 'TRC20' || !transaction.paymentProofUrl) {
            throw new DepositResolutionError(400, 'Only manual TRC20 deposits with a proof can be corrected.');
          }
          const reason = typeof correctionReason === 'string' ? correctionReason.trim() : '';
          if (reason.length < 10 || reason.length > 300 || !reviewerId) {
            throw new DepositResolutionError(400, 'Provide a correction reason of 10 to 300 characters.');
          }
          transaction.originalSubmittedAmount = transaction.amount;
          transaction.depositCorrectionReason = reason;
          transaction.depositCorrectedBy = reviewerId;
          transaction.depositCorrectedAt = new Date();
          amount = verifiedAmount;
        }
      }
      const corrected = transaction.originalSubmittedAmount != null;
      const minimum = transaction.minimumRequiredAtSubmission ?? getMinimumDepositForBalance(wallet.mainBalance);
      if (gatewayAmount === undefined && !corrected && amount < minimum) {
        throw new DepositResolutionError(400, `This deposit is below the required minimum of $${minimum.toFixed(2)} USDT.`);
      }

      const previousBalance = wallet.mainBalance;
      wallet.mainBalance += amount;
      if (previousBalance < MINIMUM_INITIAL_DEPOSIT && wallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT) {
        const approvedAt = new Date();
        if (user) {
          user.firstDepositAt = approvedAt;
          await user.save({ session });
        }
        wallet.yieldPaused = false;
        wallet.nextYieldAt = new Date(approvedAt.getTime() + DAY_IN_MS);
      }
      transaction.amount = amount;
      transaction.status = 'COMPLETED';
      await wallet.save({ session });
      await transaction.save({ session });
      result = { transaction, user, updatedMainBalance: wallet.mainBalance };
    });
    return result;
  } finally {
    await session.endSession();
  }
};
