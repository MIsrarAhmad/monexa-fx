// src/controllers/webhookController.js
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { generateBinanceSignature } from '../config/binance.js';
import { sendEmail } from '../services/emailService.js';
import { depositApprovedTemplate } from '../utils/emailTemplates.js';
import { MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';

// @desc    Receive instant payment notification from Binance Pay Webhook
// @route   POST /api/webhooks/binance
// @access  Public (Secured via Binance HMAC header validation)
export const handleBinanceWebhook = async (req, res) => {
  try {
    const headers = req.headers;
    const timestamp = headers['binancepay-timestamp'];
    const nonce = headers['binancepay-nonce'];
    const signature = headers['binancepay-signature'];
    const secretKey = process.env.BINANCE_PAY_SECRET_KEY;

    const rawBody = JSON.stringify(req.body);
    const expectedSignature = generateBinanceSignature(timestamp, nonce, rawBody, secretKey);

    // Verify webhook signature authenticity
    if (signature !== expectedSignature) {
      console.error('Binance Webhook Signature Mismatch!');
      return res.status(400).json({ returnCode: 'FAIL', returnMessage: 'Invalid Signature' });
    }

    const payload = req.body;

    if (payload.bizStatus === 'PAY_SUCCESS') {
      const data = JSON.parse(payload.data);
      const merchantTradeNo = data.merchantTradeNo;
      const depositAmount = parseFloat(data.orderAmount);

      const transaction = await Transaction.findOne({ merchantTradeNo });

      if (!transaction) {
        return res.status(404).json({ returnCode: 'FAIL', returnMessage: 'Transaction record not found' });
      }

      if (transaction.status === 'APPROVED' || transaction.status === 'COMPLETED') {
        return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: 'Already processed' });
      }

      // Update Transaction status
      transaction.status = 'COMPLETED';
      transaction.amount = depositAmount;
      await transaction.save();

      // Update User Wallet main balance
      const wallet = await Wallet.findOne({ user: transaction.user });
      const user = await User.findById(transaction.user);

      const previousBalance = wallet.mainBalance;
      wallet.mainBalance += depositAmount;
      await wallet.save();

      // If hitting >= $300 for the first time, record timestamp for 24h grace/referral qualification
      if (previousBalance < MINIMUM_INITIAL_DEPOSIT && wallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT) {
        if (!user.firstDepositAt) {
          user.firstDepositAt = new Date();
          await user.save();
        }
      }

      // Send confirmation email
      sendEmail({
        to: user.email,
        subject: 'Deposit Confirmed - TradeYield',
        html: depositApprovedTemplate(user.name, depositAmount),
      }).catch((err) => console.error('Deposit webhook email error:', err.message));

      console.log(`Deposit Webhook Processed: User ${user.email} credited +$${depositAmount} USDT`);
      return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: 'Payment Processed' });
    }

    return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: 'Event Received' });
  } catch (error) {
    console.error('Binance Webhook Processing Failure:', error.message);
    return res.status(500).json({ returnCode: 'FAIL', returnMessage: error.message });
  }
};