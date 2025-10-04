-- Create user-scoped profiles and per-nutrient RDA overrides
-- Allows up to 30 profiles per user

-- Enable required extensions (gen_random_uuid)
create extension if not exists pgcrypto;

create table if not exists "UserProfile" (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  age integer not null check (age >= 0 and age <= 130),
  sex public."Sex" not null,
  "macroProtein" real,
  "macroCarbs" real,
  "macroFat" real,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId", name)
);

comment on table "UserProfile" is 'Perfiles múltiples por usuario con overrides de macros y datos demográficos';

create index if not exists userprofile_user_idx on "UserProfile" ("userId");

create table if not exists "UserProfileRDA" (
  "userProfileId" uuid not null references "UserProfile"(id) on delete cascade,
  nutrient text not null,
  value real not null check (value >= 0),
  unit text not null,
  primary key ("userProfileId", nutrient)
);

comment on table "UserProfileRDA" is 'Overrides de RDAs (macro y micro) por perfil';

create index if not exists userprofilerda_profile_idx on "UserProfileRDA" ("userProfileId");

-- RLS
alter table "UserProfile" enable row level security;
alter table "UserProfileRDA" enable row level security;

-- Policies for UserProfile (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofile_select_own' AND polrelid = to_regclass('public."UserProfile"')
  ) THEN
    CREATE POLICY "userprofile_select_own" ON "UserProfile"
      FOR SELECT USING ("userId" = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofile_insert_own' AND polrelid = to_regclass('public."UserProfile"')
  ) THEN
    CREATE POLICY "userprofile_insert_own" ON "UserProfile"
      FOR INSERT WITH CHECK ("userId" = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofile_update_own' AND polrelid = to_regclass('public."UserProfile"')
  ) THEN
    CREATE POLICY "userprofile_update_own" ON "UserProfile"
      FOR UPDATE USING ("userId" = auth.uid()) WITH CHECK ("userId" = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofile_delete_own' AND polrelid = to_regclass('public."UserProfile"')
  ) THEN
    CREATE POLICY "userprofile_delete_own" ON "UserProfile"
      FOR DELETE USING ("userId" = auth.uid());
  END IF;
END $$;

-- Policies for UserProfileRDA: require profile ownership (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofilerda_select_own' AND polrelid = to_regclass('public."UserProfileRDA"')
  ) THEN
    CREATE POLICY "userprofilerda_select_own" ON "UserProfileRDA"
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM "UserProfile" up WHERE up.id = "UserProfileRDA"."userProfileId" AND up."userId" = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofilerda_insert_own' AND polrelid = to_regclass('public."UserProfileRDA"')
  ) THEN
    CREATE POLICY "userprofilerda_insert_own" ON "UserProfileRDA"
      FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM "UserProfile" up WHERE up.id = "UserProfileRDA"."userProfileId" AND up."userId" = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofilerda_update_own' AND polrelid = to_regclass('public."UserProfileRDA"')
  ) THEN
    CREATE POLICY "userprofilerda_update_own" ON "UserProfileRDA"
      FOR UPDATE USING (EXISTS (
        SELECT 1 FROM "UserProfile" up WHERE up.id = "UserProfileRDA"."userProfileId" AND up."userId" = auth.uid()
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "UserProfile" up WHERE up.id = "UserProfileRDA"."userProfileId" AND up."userId" = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'userprofilerda_delete_own' AND polrelid = to_regclass('public."UserProfileRDA"')
  ) THEN
    CREATE POLICY "userprofilerda_delete_own" ON "UserProfileRDA"
      FOR DELETE USING (EXISTS (
        SELECT 1 FROM "UserProfile" up WHERE up.id = "UserProfileRDA"."userProfileId" AND up."userId" = auth.uid()
      ));
  END IF;
END $$;

-- Trigger: updatedAt
create or replace function public.set_updated_at() returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end; $$ language plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'userprofile_set_updated_at'
  ) THEN
    CREATE TRIGGER userprofile_set_updated_at
    BEFORE UPDATE ON "UserProfile"
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Enforce max 30 profiles per user
create or replace function public.enforce_max_profiles() returns trigger as $$
begin
  if (select count(*) from "UserProfile" where "userId" = new."userId") >= 30 then
    raise exception 'Máximo 30 perfiles por usuario';
  end if;
  return new;
end; $$ language plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'userprofile_enforce_max'
  ) THEN
    CREATE TRIGGER userprofile_enforce_max
    BEFORE INSERT ON "UserProfile"
    FOR EACH ROW EXECUTE FUNCTION public.enforce_max_profiles();
  END IF;
END $$;
