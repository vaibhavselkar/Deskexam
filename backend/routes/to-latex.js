const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
});

async function callGeminiForLatex(base64, mimeType, apiKey) {
  const parts = [
    { inline_data: { mime_type: mimeType, data: base64 } },
    {
      text: `Convert the content in this file into a complete, compilable LaTeX document.

Rules:
- Use \\documentclass[12pt,a4paper]{article} with amsmath, amssymb, geometry packages
- Represent ALL math using proper LaTeX: $...$ for inline, \\[...\\] for display equations
- Preserve every equation, formula, symbol, and expression exactly
- For fractions use \\frac{}{}, for square roots \\sqrt{}, for integrals \\int, for Greek letters \\alpha \\beta etc.
- Keep the original structure: sections, numbered questions, options (A B C D)
- For MCQ options use an enumerate or tabular environment
- Do NOT include any explanation — return ONLY the raw LaTeX starting with \\documentclass and ending with \\end{document}`,
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
      ? 'Invalid Gemini API key.'
      : msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Strip markdown code fences if Gemini wrapped it
  const clean = text.replace(/^```(?:latex)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  if (!clean.includes('\\documentclass')) {
    throw new Error('Gemini did not return valid LaTeX. Try again.');
  }
  return clean;
}

// POST /api/to-latex  (protected)
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return res.status(500).json({ message: 'Gemini API key not configured.' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    filePath = req.file.path;
    const base64 = await fs.readFile(filePath, 'base64');
    const mimeType = req.file.mimetype;

    const latex = await callGeminiForLatex(base64, mimeType, geminiApiKey);

    res.json({ success: true, latex });
  } catch (err) {
    console.error('to-latex error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate LaTeX' });
  } finally {
    if (filePath) fs.unlink(filePath).catch(() => {});
  }
});

module.exports = router;
