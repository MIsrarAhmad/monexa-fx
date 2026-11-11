// Backend/src/controllers/stripeTestWebhookController.js
import Stripe from 'stripe';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { notifyUser } from '../services/notificationService.js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleStripeTestWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Stripe Webhook Signature Verification Failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const transactionId = session.client_reference_id;

    try {
      const transaction = await Transaction.findById(transactionId);

      if (transaction && transaction.status === 'PENDING') {
        // 1. Approve Transaction
        transaction.status = 'APPROVED';
        await transaction.save();

        // 2. Update User balance AND set firstDepositAt if not already set
        const userObj = await User.findById(transaction.user);
        if (userObj) {
          userObj.balance = (userObj.balance || 0) + transaction.amount;
          if (!userObj.firstDepositAt) {
            userObj.firstDepositAt = new Date();
          }
          await userObj.save();
        }

        // 3. Update Wallet mainBalance (Read by Dashboard UI)
        await Wallet.findOneAndUpdate(
          { user: transaction.user },
          { $inc: { mainBalance: transaction.amount } },
          { upsert: true, new: true }
        );
        await notifyUser({
          userId: transaction.user,
          type: 'DEPOSIT_APPROVED',
          title: 'Deposit credited successfully',
          message: `$${transaction.amount.toFixed(2)} USDT has been credited to your investment balance.`,
          url: '/transactions',
        });

        console.log(`✅ [TEST MODE] Deposit ${transactionId} approved! $${transaction.amount} credited & firstDepositAt set.`);
      }
    } catch (dbErr) {
      console.error('❌ Error updating test deposit in database:', dbErr.message);
    }
  }

  res.status(200).json({ received: true });
};