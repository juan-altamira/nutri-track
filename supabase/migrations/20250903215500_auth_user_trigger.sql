-- Ensure trigger exists to populate public.User on auth signups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Backfill public.User for any existing auth.users without a matching row
INSERT INTO public."User" (id, name)
SELECT u.id, u.raw_user_meta_data->>'name'
FROM auth.users u
LEFT JOIN public."User" pu ON pu.id = u.id
WHERE pu.id IS NULL;
