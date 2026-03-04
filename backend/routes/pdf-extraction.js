const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Store file in memory — no disk access needed (required for Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  }
});

// Helper function to call Gemini API
async function callGemini(base64List, mimeType, apiKey) {
  const parts = [
    ...base64List.map(b64 => ({ inline_data: { mime_type: mimeType, data: b64 } })),
    {
      text: `You are an expert at reading exam question papers. Extract ALL questions from the image(s).

Return a JSON array where each question has exactly these fields:
- "type": "MCQ" (has A/B/C/D choices), "True/False", or "Subjective"
- "question": full question text — use LaTeX for math: $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$, $\\omega$, $\\int$, etc.
- "options": array of 4 option strings for MCQ, empty [] for others
- "answer": "A"/"B"/"C"/"D" if answer key visible, else ""
- "marks": marks number if shown, else 1

Return ONLY a valid JSON array starting with [ and ending with ]. No explanation, no markdown.`,
    },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    throw new Error(msg.includes('API_KEY_INVALID') || res.status === 400
      ? 'Invalid API key — check your Gemini key in Settings.'
      : msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Gemini returned no structured data. Try again.');
  return JSON.parse(match[0]);
}

// POST /api/pdf-extract  (protected)
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ message: 'Gemini API key not configured on server. Please contact support.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { file } = req;
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype.startsWith('image/') ? file.mimetype : 'application/pdf';
    const rawQuestions = await callGemini([base64], mimeType, geminiApiKey);

    if (rawQuestions.length === 0) {
      return res.status(400).json({ message: 'Gemini found no questions. Make sure the file contains exam questions.' });
    }

    const questions = rawQuestions.map(q => ({
      id: Math.random().toString(36).slice(2),
      type: q.type === 'MCQ' ? 'MCQ' : q.type === 'True/False' ? 'True/False' : 'Subjective',
      question: String(q.question || ''),
      options: q.type === 'MCQ'
        ? [...(Array.isArray(q.options) ? q.options : []), '', '', '', ''].slice(0, 4)
        : ['', '', '', ''],
      answer: String(q.answer || ''),
      marks: Number(q.marks) || 1,
      imageUrl: null,
    }));

    res.json({
      success: true,
      questions,
      message: `🤖 ${questions.length} question${questions.length !== 1 ? 's' : ''} extracted by Gemini AI`,
      isAiResult: true,
    });

  } catch (err) {
    console.error('PDF extraction error:', err);
    res.status(500).json({ 
      message: err.message || 'PDF extraction failed',
      success: false 
    });
  }
});

module.exports = router;
