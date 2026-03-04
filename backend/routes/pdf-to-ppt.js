const express = require('express');
const multer = require('multer');
const PptxGenJS = require('pptxgenjs');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
});

async function callGeminiForSlides(base64, mimeType, apiKey, description = '') {
  const userInstructions = description
    ? `\n\nAdditional instructions from the user:\n${description}`
    : '';

  const parts = [
    { inline_data: { mime_type: mimeType, data: base64 } },
    {
      text: `You are an expert educational presentation designer. Convert the content in this file into a structured PowerPoint presentation.

Return a JSON object with:
- "title": overall presentation title (short, descriptive)
- "subject": subject/topic area
- "slides": array of slide objects

Each slide object must have:
- "title": slide heading (max 8 words)
- "bullets": array of 3-6 concise bullet points (each max 15 words)
- "type": "title" (first slide only) | "content" | "section_break"

Rules:
- First slide: type "title", include a "subtitle" field instead of bullets
- Section break slides: type "section_break", no bullets, just a title
- Content slides: type "content" with bullets
- Create 8-15 slides total
- Bullets should be concise, scannable points — not full sentences
- For math content, keep formulas readable (e.g. "F = ma", "E = mc²")
- Group related content logically${userInstructions}

Return ONLY a valid JSON object. No markdown, no explanation.`,
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
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini returned no structured data. Try again.');
  return JSON.parse(match[0]);
}

function buildPptx(pptTitle, subject, slides) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const DARK  = '1a365d';
  const MID   = '2d5a8e';
  const LIGHT = 'e8f0fe';
  const WHITE = 'FFFFFF';
  const GRAY  = '64748b';
  const TEXT  = '1e293b';

  slides.forEach((slide, i) => {
    const s = pptx.addSlide();

    if (slide.type === 'title' || i === 0) {
      // ── Title slide ──
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 3.8, w: '100%', h: 0.06, fill: { color: 'f97316' } });
      s.addText(pptTitle || slide.title, {
        x: 0.6, y: 1.2, w: 8.8, h: 1.6,
        fontSize: 36, bold: true, color: WHITE, align: 'left', fontFace: 'Calibri',
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.6, y: 3.0, w: 8.8, h: 0.7,
          fontSize: 18, color: 'bfdbfe', align: 'left', fontFace: 'Calibri',
        });
      }
      if (subject) {
        s.addText(subject, {
          x: 0.6, y: 5.0, w: 8.8, h: 0.4,
          fontSize: 12, color: '94a3b8', align: 'left', fontFace: 'Calibri',
        });
      }
    } else if (slide.type === 'section_break') {
      // ── Section break slide ──
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: MID } });
      s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 2.6, w: 1.0, h: 0.06, fill: { color: 'f97316' } });
      s.addText(slide.title, {
        x: 0.6, y: 2.0, w: 8.8, h: 1.2,
        fontSize: 32, bold: true, color: WHITE, align: 'left', fontFace: 'Calibri',
      });
    } else {
      // ── Content slide ──
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: DARK } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.55, w: '100%', h: 0.04, fill: { color: 'f97316' } });
      s.addText(slide.title, {
        x: 0.3, y: 0.08, w: 9.1, h: 0.44,
        fontSize: 18, bold: true, color: WHITE, align: 'left', fontFace: 'Calibri', valign: 'middle',
      });
      s.addText(`${i + 1}`, {
        x: 9.1, y: 0.12, w: 0.5, h: 0.32,
        fontSize: 9, color: '93c5fd', align: 'right', fontFace: 'Calibri',
      });
      const bullets = slide.bullets || [];
      bullets.forEach((bullet, j) => {
        s.addText(`• ${bullet}`, {
          x: 0.5, y: 0.85 + j * 0.72, w: 9.0, h: 0.65,
          fontSize: 15, color: TEXT, align: 'left', fontFace: 'Calibri',
        });
      });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 5.35, w: '100%', h: 0.15, fill: { color: LIGHT } });
      s.addText(pptTitle || '', {
        x: 0.3, y: 5.35, w: 9.0, h: 0.15,
        fontSize: 7, color: GRAY, align: 'left', fontFace: 'Calibri', valign: 'middle',
      });
    }
  });

  return pptx;
}

// POST /api/pdf-to-ppt  — extract slides JSON (for preview)
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return res.status(500).json({ message: 'Gemini API key not configured on server.' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const description = req.body.description || '';

    const result = await callGeminiForSlides(base64, mimeType, geminiApiKey, description);

    res.json({
      success: true,
      title: result.title || 'Presentation',
      subject: result.subject || '',
      slides: result.slides || [],
    });
  } catch (err) {
    console.error('PDF-to-PPT error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate presentation' });
  }
});

// POST /api/pdf-to-ppt/download  — generate and return .pptx binary
router.post('/download', authMiddleware, async (req, res) => {
  try {
    const { title, subject, slides } = req.body;
    if (!slides || !slides.length) return res.status(400).json({ message: 'No slides provided' });

    const pptx = buildPptx(title, subject, slides);
    const buffer = await pptx.write({ outputType: 'nodebuffer' });

    const safeName = (title || 'presentation').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pptx"`);
    res.send(buffer);
  } catch (err) {
    console.error('PPTX build error:', err);
    res.status(500).json({ message: err.message || 'Failed to build .pptx' });
  }
});

module.exports = router;
