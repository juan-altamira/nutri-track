-- Create a profiles table compatible with UI and Edge Function (Postgres 15 safe)
-- Idempotent: uses conditional checks via to_regclass / pg_policy

BEGIN;

-- 1) Create table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age integer,
  sex public."Sex",
  "macroProtein" numeric,
  "macroCarbs" numeric,
  "macroFat" numeric,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Policies (Postgres 15: use DO $$ checks instead of IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'profiles_select_owner' AND polrelid = to_regclass('public.profiles')
  ) THEN
    CREATE POLICY profiles_select_owner ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'profiles_insert_owner' AND polrelid = to_regclass('public.profiles')
  ) THEN
    CREATE POLICY profiles_insert_owner ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'profiles_update_owner' AND polrelid = to_regclass('public.profiles')
  ) THEN
    CREATE POLICY profiles_update_owner ON public.profiles
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 4) Grants (RLS will restrict row access)
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;

COMMIT;
