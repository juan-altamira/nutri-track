-- User-specific foods and nutrients
-- 1) Tables: UserFood and UserFoodNutrient
CREATE TABLE IF NOT EXISTS "public"."UserFood" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UserFood_user_name_unique" UNIQUE ("userId", "name")
);

CREATE TABLE IF NOT EXISTS "public"."UserFoodNutrient" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userFoodId" uuid NOT NULL REFERENCES "public"."UserFood"("id") ON DELETE CASCADE,
  "nutrient" text NOT NULL,
  "value" numeric NOT NULL,
  "unit" text NOT NULL,
  CONSTRAINT "UserFoodNutrient_unique_per_food" UNIQUE ("userFoodId", "nutrient")
);

-- 2) Alter FoodLog to support userFoodId and mutual exclusivity
ALTER TABLE "public"."FoodLog"
  ADD COLUMN IF NOT EXISTS "userFoodId" uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FoodLog_userFoodId_fkey'
  ) THEN
    ALTER TABLE "public"."FoodLog"
      ADD CONSTRAINT "FoodLog_userFoodId_fkey" FOREIGN KEY ("userFoodId") REFERENCES "public"."UserFood"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- foodId can be null now (either global food or user food)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'FoodLog' AND column_name = 'foodId'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."FoodLog" ALTER COLUMN "foodId" DROP NOT NULL';
    EXCEPTION WHEN others THEN
      -- ignore if already nullable
      NULL;
    END;
  END IF;
END $$;

-- mutual exclusivity check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FoodLog_food_or_userFood'
  ) THEN
    ALTER TABLE "public"."FoodLog"
      ADD CONSTRAINT "FoodLog_food_or_userFood"
      CHECK (("foodId" IS NOT NULL AND "userFoodId" IS NULL) OR ("foodId" IS NULL AND "userFoodId" IS NOT NULL));
  END IF;
END $$;

-- 3) RLS: enable and policies for ownership
ALTER TABLE "public"."UserFood" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserFoodNutrient" ENABLE ROW LEVEL SECURITY;

-- Ownership policies for UserFood
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UserFood_select_owner' AND polrelid = to_regclass('public."UserFood"')
  ) THEN
    CREATE POLICY "UserFood_select_owner" ON "public"."UserFood"
      FOR SELECT USING (auth.uid() = "userId");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UserFood_insert_owner' AND polrelid = to_regclass('public."UserFood"')
  ) THEN
    CREATE POLICY "UserFood_insert_owner" ON "public"."UserFood"
      FOR INSERT WITH CHECK (auth.uid() = "userId");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UserFood_update_owner' AND polrelid = to_regclass('public."UserFood"')
  ) THEN
    CREATE POLICY "UserFood_update_owner" ON "public"."UserFood"
      FOR UPDATE USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UserFood_delete_owner' AND polrelid = to_regclass('public."UserFood"')
  ) THEN
    CREATE POLICY "UserFood_delete_owner" ON "public"."UserFood"
      FOR DELETE USING (auth.uid() = "userId");
  END IF;
END $$;

-- Ownership policies for UserFoodNutrient referencing UserFood
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UFN_select_owner' AND polrelid = to_regclass('public."UserFoodNutrient"')
  ) THEN
    CREATE POLICY "UFN_select_owner" ON "public"."UserFoodNutrient"
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM "public"."UserFood" uf
          WHERE uf.id = "userFoodId" AND uf."userId" = auth.uid()
        )
      );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UFN_insert_owner' AND polrelid = to_regclass('public."UserFoodNutrient"')
  ) THEN
    CREATE POLICY "UFN_insert_owner" ON "public"."UserFoodNutrient"
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM "public"."UserFood" uf
          WHERE uf.id = "userFoodId" AND uf."userId" = auth.uid()
        )
      );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UFN_update_owner' AND polrelid = to_regclass('public."UserFoodNutrient"')
  ) THEN
    CREATE POLICY "UFN_update_owner" ON "public"."UserFoodNutrient"
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM "public"."UserFood" uf
          WHERE uf.id = "userFoodId" AND uf."userId" = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM "public"."UserFood" uf
          WHERE uf.id = "userFoodId" AND uf."userId" = auth.uid()
        )
      );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'UFN_delete_owner' AND polrelid = to_regclass('public."UserFoodNutrient"')
  ) THEN
    CREATE POLICY "UFN_delete_owner" ON "public"."UserFoodNutrient"
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM "public"."UserFood" uf
          WHERE uf.id = "userFoodId" AND uf."userId" = auth.uid()
        )
      );
  END IF;
END $$;

-- 4) Grants (RLS will restrict data access)
GRANT ALL ON TABLE "public"."UserFood" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."UserFoodNutrient" TO anon, authenticated, service_role;
