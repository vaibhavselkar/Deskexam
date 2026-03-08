const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3001';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Email, password and name are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ email, password, fullName, emailVerifyToken: verifyToken, emailVerified: false });

    const verifyUrl = `${FRONTEND}/auth?verify=${verifyToken}`;
    try {
      await createTransporter().sendMail({
        from: `Deskexam <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Verify your Deskexam email',
        html: `<p>Hi ${fullName},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link does not expire. If you didn't create an account, ignore this email.</p>`,
      });
    } catch (_) { /* email failure shouldn't block registration */ }

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ emailVerifyToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid or already used verification link.' });
    user.emailVerified = true;
    user.emailVerifyToken = null;
    await user.save();
    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/resend-verification  (public — takes email)
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = email ? await User.findOne({ email }) : null;
    // Always respond the same to prevent enumeration
    if (!user || user.emailVerified) return res.json({ message: 'If this email exists and is unverified, a link has been sent.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken = verifyToken;
    await user.save();

    const verifyUrl = `${FRONTEND}/auth?verify=${verifyToken}`;
    await createTransporter().sendMail({
      from: `Deskexam <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Verify your Deskexam email',
      html: `<p>Hi ${user.fullName},</p><p>Click below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    res.json({ message: 'Verification email resent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Please verify your email before signing in. Check your inbox for the verification link.', unverified: true });
    }
    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/profile  (protected)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/decrement-credit  (protected)
router.patch('/decrement-credit', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.credits > 0) {
      user.credits -= 1;
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always respond the same to prevent email enumeration
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${FRONTEND}/auth?reset=${token}`;

    await createTransporter().sendMail({
      from: `Deskexam <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset your Deskexam password',
      html: `<p>Hello ${user.fullName},</p><p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`,
    });

    res.json({ message: 'Reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const jwtToken = signToken(user._id);
    res.json({ token: jwtToken, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, fullName: name, googleId, password: crypto.randomBytes(16).toString('hex'), emailVerified: true });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.emailVerified) user.emailVerified = true;
      await user.save();
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
