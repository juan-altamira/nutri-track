-- Add userProfileId to FoodLog to associate logs with specific user profiles
BEGIN;

ALTER TABLE "public"."FoodLog"
  ADD COLUMN IF NOT EXISTS "userProfileId" uuid REFERENCES "public"."UserProfile"(id) ON DELETE CASCADE;

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
