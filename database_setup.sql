-- ============================================
-- DATABASE SCHEMA FOR AI TUTOR APPLICATION
-- ============================================

-- Extension required for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. PROFILES TABLE (Extends Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    skills text[] DEFAULT '{}'::text[],
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON public.profiles USING GIN(skills);

-- Enable Row Level Security (RLS) for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. PDFS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.pdfs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name text,
    content text,
    file_size integer,
    uploaded_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes on pdfs
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON public.pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_uploaded_at ON public.pdfs(uploaded_at);

-- Enable RLS for pdfs
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdfs
CREATE POLICY "Users can view own pdfs" ON public.pdfs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pdfs" ON public.pdfs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pdfs" ON public.pdfs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pdfs" ON public.pdfs FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. CHAT SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text DEFAULT 'New Chat'::text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes on chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at);

-- Enable RLS for chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    role text CHECK (role IN ('user', 'assistant', 'system')),
    content text,
    created_at timestamptz DEFAULT now()
);

-- Indexes on chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- Enable RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedules (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text DEFAULT 'Untitled Schedule'::text,
    content jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on schedules
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules(created_at);

-- Enable RLS for schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedules
CREATE POLICY "Users can view own schedules" ON public.schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedules" ON public.schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON public.schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedules" ON public.schedules FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. QUIZ RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    topic text,
    score integer,
    total_questions integer,
    quiz_data jsonb NOT NULL,
    user_answers jsonb NOT NULL,
    ai_analysis jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on quiz_results
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON public.quiz_results(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_topic ON public.quiz_results(topic);

-- Enable RLS for quiz_results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_results
CREATE POLICY "Users can view own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz results" ON public.quiz_results FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. GOOGLE CALENDAR TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token text,
    refresh_token text NOT NULL,
    scope text,
    token_type text,
    expiry_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON public.google_calendar_tokens(user_id);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own google tokens" ON public.google_calendar_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own google tokens" ON public.google_calendar_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own google tokens" ON public.google_calendar_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own google tokens" ON public.google_calendar_tokens FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- AUTO UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pdfs_updated_at BEFORE UPDATE ON public.pdfs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_calendar_tokens_updated_at BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- USEFUL QUERIES (EXAMPLES)
-- ============================================
-- Query to view user profile with skills
-- SELECT id, full_name, email, skills, created_at FROM public.profiles WHERE id = 'user-uuid-here';

-- Query to search users by skill
-- SELECT id, full_name, skills FROM public.profiles WHERE 'Python' = ANY(skills);

-- Query to count users per skill
-- SELECT unnest(skills) as skill, COUNT(*) as user_count FROM public.profiles GROUP BY skill ORDER BY user_count DESC;

-- Query to view user chat sessions
-- SELECT * FROM public.chat_sessions WHERE user_id = 'user-uuid-here' ORDER BY updated_at DESC;

-- Query to view chat messages in a session
-- SELECT * FROM public.chat_messages WHERE session_id = 'session-uuid-here' ORDER BY created_at ASC;

-- Query to view user PDFs
-- SELECT id, file_name, file_size, uploaded_at FROM public.pdfs WHERE user_id = 'user-uuid-here' ORDER BY uploaded_at DESC;

-- Query to view user schedules
-- SELECT id, name, created_at FROM public.schedules WHERE user_id = 'user-uuid-here' ORDER BY created_at DESC;

-- Query to view user quiz results
-- SELECT id, topic, score, total_questions, created_at FROM public.quiz_results WHERE user_id = 'user-uuid-here' ORDER BY created_at DESC;
