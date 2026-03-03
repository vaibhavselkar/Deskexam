# ShikshaSetu 🎓
### Professional Question Paper Creator for Indian Teachers

> LaTeX-powered • CBSE/JEE/NEET Templates • PDF Tools • Photo to LaTeX AI

---

## 🚀 Quick Start (VS Code Terminal)

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free at supabase.com)

### Step 1: Install Dependencies
```bash
cd shikshasetu
npm install
```

### Step 2: Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the Supabase Dashboard → **SQL Editor** → paste and run the entire `supabase/schema.sql` file
3. In **Authentication → Providers**:
   - Enable **Google OAuth** (add your Google Client ID/Secret)
   - Enable **Email** with OTP/Magic Link
4. In **Storage**, create these buckets (all private):
   - `paper-pdfs`
   - `question-images`
   - `imported-pdfs`
   - `photo-questions`

### Step 3: Configure Environment
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_UPI_ID=shikshasetu@upi
```

### Step 4: Run Development Server
```bash
npm start
```
App runs at `http://localhost:3000`

### Step 5: Build for Production
```bash
npm run build
```

---

## 📁 Project Structure

```
shikshasetu/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── Navbar.jsx          # Top navigation bar
│   │   ├── editor/
│   │   │   ├── LatexRenderer.jsx   # KaTeX LaTeX rendering
│   │   │   └── PdfPreview.jsx      # Live A4 PDF preview
│   │   └── payment/
│   │       └── PaywallModal.jsx    # Credits exhausted modal
│   ├── hooks/
│   │   └── useAuth.js              # Auth context + profile
│   ├── lib/
│   │   └── supabase.js             # Supabase client + helpers
│   ├── pages/
│   │   ├── LandingPage.jsx         # Marketing homepage
│   │   ├── AuthPage.jsx            # Google OAuth + Email OTP
│   │   ├── Dashboard.jsx           # User dashboard + library
│   │   ├── EditorPage.jsx          # Main paper editor (split-pane)
│   │   ├── TemplatesPage.jsx       # 11 template gallery
│   │   ├── PdfToolsPage.jsx        # PDF/Photo conversion tools
│   │   └── PaymentPage.jsx         # UPI QR + UTR submission
│   ├── styles/
│   │   └── index.css               # Global styles + Tailwind
│   ├── App.js                      # Router + auth guard
│   └── index.js                    # React entry point
├── supabase/
│   └── schema.sql                  # Complete DB schema + RLS
├── .env.example                    # Environment template
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 🗄️ Database Schema (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `profiles` | User data, credits, subscription status |
| `papers` | Saved question papers (JSON questions) |
| `templates` | 11 template configurations |
| `transactions` | UPI payment records + verification |
| `pdf_imports` | PDF import history |
| `photo_questions` | Photo-to-LaTeX conversion records |

### Key Database Functions
- `decrement_credit(user_uuid)` — Safely decrements credit count
- `increment_paper_count(user_uuid)` — Updates paper counter
- `verify_and_activate_subscription(txn_id, admin_id)` — Admin payment verification

---

## ✨ Features

### Core Editor
- **Split-pane layout** — Edit left, live A4 preview right
- **LaTeX rendering** — KaTeX powered (`$\frac{1}{2}$` syntax)
- **Question types** — MCQ, True/False, Subjective
- **Image upload** — Per-question diagram support
- **One-click PDF download** — html2canvas + jsPDF

### Credit System
- New users: **3 free credits**
- Each download decrements by 1
- Monthly Pro: ₹200 / Yearly Pro: ₹2000 (unlimited)
- Paywall modal on credit exhaustion

### PDF Power Tools
- **PDF → Editor** — Import existing papers
- **PDF → LaTeX** — Extract math as LaTeX code
- **PDF → PPT** — Convert to presentation slides
- **Photo → LaTeX** — AI OCR for handwritten questions

### 11 Templates
1. CBSE Board Style
2. JEE Mock Test
3. Weekly Class Test
4. NEET Mock Test
5. Colorful Kids
6. Math Olympiad
7. Coaching Premium
8. Formal Collegiate
9. ICSE Standard
10. Chapter-wise Test
11. Pro Custom Builder ⭐

---

## 💳 Payment Flow

1. User selects Monthly (₹200) or Yearly (₹2000) plan
2. UPI QR code shown with `shikshasetu@upi`
3. User pays via GPay/PhonePe/Paytm
4. User enters UTR/Transaction ID
5. Transaction saved in DB as `pending`
6. Admin verifies → runs `verify_and_activate_subscription()`
7. User's subscription activates automatically

---

## 🔧 VS Code Terminal Commands

```bash
# Install all packages
npm install

# Start dev server
npm start

# Type check (if TypeScript added)
npx tsc --noEmit

# Build production bundle
npm run build

# Install specific package
npm install package-name

# Check for outdated packages
npm outdated

# Update packages
npm update
```

### Additional Libraries to Install (Optional)
```bash
# For real QR code generation
npm install qrcode.react

# For PPTX generation (PDF to PPT)
npm install pptxgenjs

# For PDF text extraction
npm install pdf-parse

# For real photo OCR (connect to Google Vision API)
npm install @google-cloud/vision
```

---

## 🌐 Deployment

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
# Drag 'build' folder to netlify.com/drop
```

---

## 📞 Support
- Email: support@shikshasetu.in  
- UPI: shikshasetu@upi

---

*Built with ❤️ for Indian Teachers | ShikshaSetu © 2024*
