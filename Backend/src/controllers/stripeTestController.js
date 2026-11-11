// Backend/src/controllers/stripeTestController.js
import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import { MINIMUM_DEPOSIT_AMOUNT } from "../config/constants.js";

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

    if (!amount || Number(amount) < MINIMUM_DEPOSIT_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Deposit amount below required minimum. Every deposit must be at least $${MINIMUM_DEPOSIT_AMOUNT} USD/USDT.`,
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
              description: "Deposit for an account eligible for the stated daily investment return.",
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