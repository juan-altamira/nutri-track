-- Remote apply: UserProfile and UserProfileRDA schema, RLS and triggers
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

create index if not exists userprofile_user_idx on "UserProfile" ("userId");

create table if not exists "UserProfileRDA" (
  "userProfileId" uuid not null references "UserProfile"(id) on delete cascade,
  nutrient text not null,
  value real not null check (value >= 0),
  unit text not null,
  primary key ("userProfileId", nutrient)
);

create index if not exists userprofilerda_profile_idx on "UserProfileRDA" ("userProfileId");

alter table "UserProfile" enable row level security;
alter table "UserProfileRDA" enable row level security;

create policy if not exists "userprofile_select_own" on "UserProfile"
  for select using ("userId" = auth.uid());

create policy if not exists "userprofile_insert_own" on "UserProfile"
  for insert with check ("userId" = auth.uid());

create policy if not exists "userprofile_update_own" on "UserProfile"
  for update using ("userId" = auth.uid()) with check ("userId" = auth.uid());

create policy if not exists "userprofile_delete_own" on "UserProfile"
  for delete using ("userId" = auth.uid());

create policy if not exists "userprofilerda_select_own" on "UserProfileRDA"
  for select using (exists (
    select 1 from "UserProfile" up where up.id = "UserProfileRDA"."userProfileId" and up."userId" = auth.uid()
  ));

create policy if not exists "userprofilerda_insert_own" on "UserProfileRDA"
  for insert with check (exists (
    select 1 from "UserProfile" up where up.id = "UserProfileRDA"."userProfileId" and up."userId" = auth.uid()
  ));

create policy if not exists "userprofilerda_update_own" on "UserProfileRDA"
  for update using (exists (
    select 1 from "UserProfile" up where up.id = "UserProfileRDA"."userProfileId" and up."userId" = auth.uid()
  )) with check (exists (
    select 1 from "UserProfile" up where up.id = "UserProfileRDA"."userProfileId" and up."userId" = auth.uid()
  ));

create policy if not exists "userprofilerda_delete_own" on "UserProfileRDA"
  for delete using (exists (
    select 1 from "UserProfile" up where up.id = "UserProfileRDA"."userProfileId" and up."userId" = auth.uid()
  ));

create or replace function public.set_updated_at() returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end; $$ language plpgsql;

create trigger if not exists userprofile_set_updated_at
before update on "UserProfile"
for each row execute function public.set_updated_at();

create or replace function public.enforce_max_profiles() returns trigger as $$
begin
  if (select count(*) from "UserProfile" where "userId" = new."userId") >= 30 then
    raise exception 'Máximo 30 perfiles por usuario';
  end if;
  return new;
end; $$ language plpgsql;

create trigger if not exists userprofile_enforce_max
before insert on "UserProfile"
for each row execute function public.enforce_max_profiles();
