// src/controllers/webhookController.js
import { generateBinanceSignature } from '../config/binance.js';
import { sendResolutionTransactionEmail } from '../utils/transactionEmail.js';
import { notifyUser } from '../services/notificationService.js';
import { DepositResolutionError, resolveDeposit } from '../services/depositResolution.js';

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
      if (typeof merchantTradeNo !== 'string' || !merchantTradeNo.trim()) {
        return res.status(400).json({ returnCode: 'FAIL', returnMessage: 'Missing merchant trade number' });
      }
      if (data.orderAmount === undefined || data.orderAmount === null) {
        return res.status(400).json({ returnCode: 'FAIL', returnMessage: 'Missing payment amount' });
      }
      const { transaction, user } = await resolveDeposit({
        merchantTradeNo, action: 'APPROVE', gatewayAmount: data.orderAmount,
      });
      const depositAmount = transaction.amount;

      void sendResolutionTransactionEmail(transaction, 'completed', user);
      await notifyUser({
        userId: transaction.user,
        type: 'DEPOSIT_APPROVED',
        title: 'Deposit credited successfully',
        message: `$${depositAmount.toFixed(2)} USDT has been credited to your investment balance.`,
        url: '/transactions',
      });

      console.log(`Deposit Webhook Processed: Transaction ${transaction._id} credited +$${depositAmount} USDT`);
      return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: 'Payment Processed' });
    }

    return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: 'Event Received' });
  } catch (error) {
    if (error instanceof DepositResolutionError) {
      if (error.status === 409) {
        if (error.depositStatus === 'REJECTED') {
          console.error('Binance payment received for a rejected deposit; manual reconciliation is required.');
          return res.status(409).json({ returnCode: 'FAIL', returnMessage: 'Deposit rejected; manual reconciliation required' });
        }
        return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: 'Already processed' });
      }
      return res.status(error.status).json({ returnCode: 'FAIL', returnMessage: error.message });
    }
    console.error('Binance Webhook Processing Failure:', error.message);
    return res.status(500).json({ returnCode: 'FAIL', returnMessage: error.message });
  }
};