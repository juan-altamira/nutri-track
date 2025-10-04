-- Function to seed UserProfileRDA from RecommendedDailyAllowance according to age/sex
create or replace function public.seed_user_profile_rda(profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_age integer;
  v_sex public."Sex";
  v_age_group text;
begin
  select "userId", age, sex into v_user, v_age, v_sex from "UserProfile" where id = profile_id;
  if v_user is null then
    raise exception 'Perfil no encontrado';
  end if;
  if v_user <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  if v_age <= 8 then v_age_group := '4-8';
  elsif v_age <= 13 then v_age_group := '9-13';
  elsif v_age <= 18 then v_age_group := '14-18';
  elsif v_age <= 50 then v_age_group := '19-50';
  elsif v_age <= 70 then v_age_group := '51-70';
  else v_age_group := '71+';
  end if;

  insert into "UserProfileRDA" ("userProfileId", nutrient, value, unit)
  select profile_id, r.nutrient, r.value, r.unit
  from "RecommendedDailyAllowance" r
  where r."ageGroup" = v_age_group
    and (r.sex is null or r.sex = v_sex)
  on conflict ("userProfileId", nutrient) do nothing;
end;
$$;
