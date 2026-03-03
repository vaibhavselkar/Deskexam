-- ============================================================
-- ShikshaSetu - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  institute_name TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'monthly', 'yearly')),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  total_papers_created INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- PAPERS TABLE
-- ============================================================
CREATE TABLE public.papers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Paper',
  institute_name TEXT,
  teacher_name TEXT,
  subject TEXT NOT NULL DEFAULT 'Mathematics',
  class_name TEXT,
  max_marks INTEGER DEFAULT 100,
  time_duration TEXT DEFAULT '3 Hours',
  template_id TEXT DEFAULT 'cbse-standard',
  questions JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  pdf_url TEXT,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for papers
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own papers"
  ON public.papers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS TABLE (Payment Records)
-- ============================================================
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  utr_number TEXT,
  payment_method TEXT DEFAULT 'upi',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TEMPLATES TABLE
-- ============================================================
CREATE TABLE public.templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'standard',
  thumbnail_url TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_pro BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates are public-readable
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are viewable by all authenticated users"
  ON public.templates FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- ============================================================
-- PDF_IMPORTS TABLE (Track imported PDFs)
-- ============================================================
CREATE TABLE public.pdf_imports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  file_url TEXT,
  extracted_text TEXT,
  latex_output TEXT,
  import_type TEXT DEFAULT 'text' CHECK (import_type IN ('text', 'latex', 'ppt', 'layout')),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for pdf_imports
ALTER TABLE public.pdf_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own imports"
  ON public.pdf_imports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PHOTO_QUESTIONS TABLE (Image to LaTeX)
-- ============================================================
CREATE TABLE public.photo_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  extracted_text TEXT,
  latex_output TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.photo_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own photo_questions"
  ON public.photo_questions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Dashboard > Storage)
-- ============================================================
-- Create bucket: 'paper-pdfs' (private)
-- Create bucket: 'question-images' (private)
-- Create bucket: 'imported-pdfs' (private)
-- Create bucket: 'photo-questions' (private)

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER papers_updated_at
  BEFORE UPDATE ON public.papers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Decrement credits function (called from app)
CREATE OR REPLACE FUNCTION public.decrement_credit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits = GREATEST(0, credits - 1)
  WHERE id = user_uuid
  RETURNING credits INTO new_credits;
  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment paper count function
CREATE OR REPLACE FUNCTION public.increment_paper_count(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET total_papers_created = total_papers_created + 1
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify payment and activate subscription
CREATE OR REPLACE FUNCTION public.verify_and_activate_subscription(
  transaction_uuid UUID,
  admin_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  txn RECORD;
  end_date TIMESTAMPTZ;
BEGIN
  SELECT * INTO txn FROM public.transactions WHERE id = transaction_uuid;

  IF txn.plan_type = 'monthly' THEN
    end_date := NOW() + INTERVAL '30 days';
  ELSE
    end_date := NOW() + INTERVAL '365 days';
  END IF;

  UPDATE public.transactions
  SET status = 'verified', verified_at = NOW(), verified_by = admin_uuid
  WHERE id = transaction_uuid;

  UPDATE public.profiles
  SET
    subscription_status = txn.plan_type,
    subscription_start = NOW(),
    subscription_end = end_date,
    credits = 9999
  WHERE id = txn.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED TEMPLATES DATA
-- ============================================================
INSERT INTO public.templates (id, name, description, category, config, is_pro) VALUES
  ('cbse-standard', 'CBSE Board Style', 'Standard CBSE examination format with proper headers and section divisions', 'board', '{"fontFamily":"Times New Roman","fontSize":12,"margins":{"top":25,"bottom":25,"left":30,"right":25},"headerStyle":"formal","showRollNumber":true,"showInstructions":true,"accentColor":"#1a365d"}', false),
  ('jee-mock', 'JEE Mock Test', 'JEE Mains/Advanced style with Physics, Chemistry & Math sections', 'competitive', '{"fontFamily":"Arial","fontSize":11,"margins":{"top":20,"bottom":20,"left":25,"right":20},"headerStyle":"minimal","showSectionBold":true,"sectionsPerPage":3,"accentColor":"#dc2626"}', false),
  ('weekly-test', 'Weekly Class Test', 'Quick weekly assessment format for classroom use', 'class', '{"fontFamily":"Arial","fontSize":12,"margins":{"top":20,"bottom":20,"left":25,"right":20},"headerStyle":"simple","showDate":true,"accentColor":"#2563eb"}', false),
  ('neet-mock', 'NEET Mock Test', 'NEET style paper for Biology, Physics and Chemistry', 'competitive', '{"fontFamily":"Times New Roman","fontSize":12,"margins":{"top":20,"bottom":20,"left":25,"right":20},"headerStyle":"formal","showOMR":false,"accentColor":"#16a34a"}', false),
  ('colorful-kids', 'Colorful Kids', 'Fun and engaging format for younger students', 'school', '{"fontFamily":"Comic Sans MS","fontSize":13,"margins":{"top":30,"bottom":30,"left":35,"right":30},"headerStyle":"colorful","showIllustrations":true,"accentColor":"#7c3aed"}', false),
  ('olympiad', 'Math Olympiad', 'International Olympiad style for gifted students', 'competitive', '{"fontFamily":"Times New Roman","fontSize":12,"margins":{"top":25,"bottom":25,"left":30,"right":25},"headerStyle":"elegant","showProblemNumbers":true,"accentColor":"#b45309"}', false),
  ('coaching-premium', 'Coaching Institute Premium', 'Professional format for private coaching institutes', 'coaching', '{"fontFamily":"Arial","fontSize":11,"margins":{"top":20,"bottom":20,"left":25,"right":20},"headerStyle":"branded","showLogo":true,"accentColor":"#0f766e"}', false),
  ('formal-collegiate', 'Formal Collegiate', 'University-level examination format', 'university', '{"fontFamily":"Times New Roman","fontSize":12,"margins":{"top":30,"bottom":30,"left":35,"right":30},"headerStyle":"formal","showDepartment":true,"accentColor":"#1e3a5f"}', false),
  ('icse-standard', 'ICSE Standard', 'ICSE board examination style paper', 'board', '{"fontFamily":"Times New Roman","fontSize":12,"margins":{"top":25,"bottom":25,"left":30,"right":25},"headerStyle":"formal","showInstructions":true,"accentColor":"#1a1a2e"}', false),
  ('chapter-test', 'Chapter-wise Test', 'Focused single-chapter assessment format', 'class', '{"fontFamily":"Arial","fontSize":12,"margins":{"top":20,"bottom":20,"left":25,"right":20},"headerStyle":"simple","showChapter":true,"accentColor":"#0369a1"}', false),
  ('pro-custom', 'Pro Custom Builder', 'Fully customizable template — drag headers, set fonts, adjust margins', 'pro', '{"fontFamily":"Times New Roman","fontSize":12,"margins":{"top":25,"bottom":25,"left":30,"right":25},"headerStyle":"custom","isEditable":true,"accentColor":"#6d28d9"}', true);
