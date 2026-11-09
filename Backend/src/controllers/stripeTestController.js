// Backend/src/controllers/stripeTestController.js
import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import Wallet from "../models/Wallet.js";
import { MINIMUM_INITIAL_DEPOSIT } from "../config/constants.js";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export const createStripeTestSession = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized access. User authentication required.",
      });
    }

    // Fetch user's current wallet balance
    const wallet = await Wallet.findOne({ user: userId });
    const currentBalance = wallet ? wallet.mainBalance : 0;

    // Calculate dynamic minimum required deposit threshold
    let minRequired = MINIMUM_INITIAL_DEPOSIT;
    if (currentBalance > 0 && currentBalance < MINIMUM_INITIAL_DEPOSIT) {
      minRequired = MINIMUM_INITIAL_DEPOSIT - currentBalance;
    } else if (currentBalance >= MINIMUM_INITIAL_DEPOSIT) {
      minRequired = 1; // Subsequent deposits after initial $300 threshold
    }

    // Enforce dynamic threshold
    if (!amount || Number(amount) < minRequired) {
      return res.status(400).json({
        success: false,
        error: `Deposit amount below required threshold. Minimum allowed deposit for your account is $${minRequired} USD/USDT.`,
      });
    }

    // Create Pending Ledger Transaction
    const transaction = await Transaction.create({
      user: userId,
      type: "DEPOSIT",
      amount: Number(amount),
      netAmount: Number(amount),
      status: "PENDING",
      txHash: `STRIPE_TEST_${Date.now()}`,
      description: "Stripe Test Deposit Payment",
    });

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TradeYield Test Capital Deposit",
              description: "Activates/expands daily 1% yield compounding account.",
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      client_reference_id: transaction._id.toString(),
      customer_email: req.user.email || "testuser@tradeyield.com",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?deposit=success`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?deposit=cancelled`,
    });

    res.status(200).json({
      success: true,
      url: session.url,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("Stripe Test Session Error:", error.message);
    next(error);
  }
};