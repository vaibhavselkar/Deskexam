const express = require('express');
const Paper = require('../models/Paper');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/papers
router.get('/', async (req, res) => {
  try {
    const papers = await Paper.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/papers/:id
router.get('/:id', async (req, res) => {
  try {
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.userId });
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/papers
router.post('/', async (req, res) => {
  try {
    const paper = await Paper.create({ ...req.body, userId: req.userId });
    // Increment totalPapersCreated
    await User.findByIdAndUpdate(req.userId, { $inc: { totalPapersCreated: 1 } });
    res.status(201).json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/papers/:id
router.put('/:id', async (req, res) => {
  try {
    const paper = await Paper.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, userId: req.userId },
      { new: true, runValidators: true }
    );
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', async (req, res) => {
  try {
    const paper = await Paper.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    res.json({ message: 'Paper deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
