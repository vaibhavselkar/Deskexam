require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://shikshasetu-seven.vercel.app',
  'https://deskexam.com',
  'https://api.deskexam.com',
  'https://www.deskexam.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/razorpay', require('./routes/razorpay'));
app.use('/api/pdf-extract', require('./routes/pdf-extraction'));
app.use('/api/pdf-to-ppt', require('./routes/pdf-to-ppt'));
app.use('/api/to-latex', require('./routes/to-latex'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Listen only when running directly (not when imported by Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;