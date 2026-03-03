const express = require('express');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const txn = await Transaction.create({ ...req.body, userId: req.userId });
    res.status(201).json(txn);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const txns = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
