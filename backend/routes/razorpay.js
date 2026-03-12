const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const authMiddleware = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

console.log('Razorpay initialized with:', {
  keyId: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set',
  keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set'
});

router.use(authMiddleware);

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { planType, amount } = req.body;

    console.log('Creating order with:', { planType, amount, userId: req.userId });
    console.log('Razorpay config:', {
      keyId: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set',
      keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set'
    });

    // Debug: Log the actual keys (be careful with this in production)
    console.log('Razorpay keys for debugging:', {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0
    });

    if (!planType || !amount) {
      return res.status(400).json({ message: 'Plan type and amount are required' });
    }

    // Validate plan type
    if (!['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    // Validate amount
    const validAmounts = { monthly: 200, yearly: 2000 };
    if (amount !== validAmounts[planType]) {
      return res.status(400).json({ message: 'Invalid amount for selected plan' });
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}_${req.userId}`,
      notes: {
        planType,
        userId: req.userId.toString()
      }
    };

    console.log('Order options:', options);

    const order = await razorpay.orders.create(options);
    
    console.log('Order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planType
    });
  } catch (err) {
    console.error('Razorpay order creation error:', {
      message: err.message,
      statusCode: err.statusCode,
      description: err.error?.description,
      code: err.error?.code,
      stack: err.stack
    });
    
    // Provide more specific error messages
    if (err.statusCode === 401) {
      return res.status(500).json({ 
        message: 'Payment gateway authentication failed. Please contact support.',
        error: 'RAZORPAY_AUTH_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create order',
      error: err.message 
    });
  }
});

// Verify payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment details are required' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId: req.userId,
      planType,
      amount: planType === 'monthly' ? 200 : 2000, // Use the plan amount
      utrNumber: razorpay_payment_id,
      paymentMethod: 'razorpay',
      status: 'verified'
    });

    // Update user subscription
    const user = await User.findById(req.userId);
    if (user) {
      const now = new Date();
      const planDuration = planType === 'monthly' ? 30 : 365;
      const expiryDate = new Date(now.getTime() + planDuration * 24 * 60 * 60 * 1000);
      
      user.subscription = {
        planType,
        isActive: true,
        startDate: now,
        expiryDate: expiryDate,
        paymentMethod: 'razorpay'
      };
      
      await user.save();
    }

    res.json({
      message: 'Payment verified successfully',
      transactionId: transaction._id
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Get payment history
router.get('/payment-history', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(transactions);
  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
});

module.exports = router;