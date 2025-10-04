-- Attach food logs to specific user profiles (idempotent)
BEGIN;

ALTER TABLE "public"."FoodLog"
  ADD COLUMN IF NOT EXISTS "userProfileId" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FoodLog_userProfileId_fkey'
  ) THEN
    ALTER TABLE "public"."FoodLog"
      ADD CONSTRAINT "FoodLog_userProfileId_fkey"
      FOREIGN KEY ("userProfileId") REFERENCES "public"."UserProfile"(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FoodLog_userProfileId_idx" ON "public"."FoodLog" ("userProfileId");

DROP POLICY IF EXISTS "Allow individual insert access" ON "public"."FoodLog";
CREATE POLICY "Allow individual insert access" ON "public"."FoodLog"
  FOR INSERT
  WITH CHECK (
    auth.uid() = "userId"
    AND (
      "userProfileId" IS NULL
      OR EXISTS (
        SELECT 1 FROM "public"."UserProfile" up
        WHERE up.id = "userProfileId" AND up."userId" = auth.uid()
      )
    )
  );

COMMIT;
