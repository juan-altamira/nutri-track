

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."FoodSource" AS ENUM (
    'GLOBAL',
    'CUSTOM'
);


ALTER TYPE "public"."FoodSource" OWNER TO "postgres";


CREATE TYPE "public"."Role" AS ENUM (
    'OWNER',
    'CLIENT'
);


ALTER TYPE "public"."Role" OWNER TO "postgres";


CREATE TYPE "public"."Sex" AS ENUM (
    'MALE',
    'FEMALE',
    'BOTH'
);


ALTER TYPE "public"."Sex" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Inserta el nuevo usuario en tu tabla "User", tomando el ID de auth.users
  INSERT INTO public."User" (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Food" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "protein" real NOT NULL,
    "carbohydrates" real NOT NULL,
    "fat" real NOT NULL,
    "calories" real NOT NULL,
    "source" "public"."FoodSource" DEFAULT 'GLOBAL'::"public"."FoodSource" NOT NULL,
    "vitaminA" real,
    "vitaminC" real,
    "vitaminD" real,
    "vitaminE" real,
    "vitaminK" real,
    "vitaminB1" real,
    "vitaminB2" real,
    "vitaminB3" real,
    "vitaminB6" real,
    "folate" real,
    "vitaminB12" real,
    "vitaminB5" real,
    "vitaminB7" real,
    "choline" real,
    "calcium" real,
    "chloride" real,
    "chromium" real,
    "copper" real,
    "fluoride" real,
    "iodine" real,
    "iron" real,
    "magnesium" real,
    "manganese" real,
    "molybdenum" real,
    "phosphorus" real,
    "potassium" real,
    "selenium" real,
    "zinc" real,
    "creatorId" "uuid",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Food" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."FoodLog" (
    "id" "text" NOT NULL,
    "date" "date" NOT NULL,
    "quantity" real NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "userId" "uuid" NOT NULL,
    "foodId" "text" NOT NULL
);


ALTER TABLE "public"."FoodLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Profile" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "age" integer NOT NULL,
    "sex" "public"."Sex" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ownerId" "uuid" NOT NULL
);


ALTER TABLE "public"."Profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."RecommendedDailyAllowance" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "nutrient" "text" NOT NULL,
    "ageGroup" "text" NOT NULL,
    "sex" "public"."Sex",
    "value" real NOT NULL,
    "unit" "text" NOT NULL
);


ALTER TABLE "public"."RecommendedDailyAllowance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "age" integer,
    "sex" "public"."Sex",
    "role" "public"."Role" DEFAULT 'OWNER'::"public"."Role" NOT NULL,
    "subscriptionStatus" "text" DEFAULT 'trialing'::"text" NOT NULL,
    "trialEndsAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ownerId" "uuid"
);


ALTER TABLE "public"."User" OWNER TO "postgres";


ALTER TABLE ONLY "public"."FoodLog"
    ADD CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Food"
    ADD CONSTRAINT "Food_name_creatorId_key" UNIQUE ("name", "creatorId");



ALTER TABLE ONLY "public"."Food"
    ADD CONSTRAINT "Food_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."RecommendedDailyAllowance"
    ADD CONSTRAINT "RecommendedDailyAllowance_nutrient_ageGroup_sex_key" UNIQUE ("nutrient", "ageGroup", "sex");



ALTER TABLE ONLY "public"."RecommendedDailyAllowance"
    ADD CONSTRAINT "RecommendedDailyAllowance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."FoodLog"
    ADD CONSTRAINT "FoodLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."FoodLog"
    ADD CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Food"
    ADD CONSTRAINT "Food_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL;



CREATE POLICY "Allow authenticated read access" ON "public"."Food" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access" ON "public"."FoodLog" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access" ON "public"."Profile" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access" ON "public"."RecommendedDailyAllowance" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access" ON "public"."User" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow individual delete access" ON "public"."FoodLog" FOR DELETE USING (("auth"."uid"() = "userId"));



CREATE POLICY "Allow individual insert access" ON "public"."FoodLog" FOR INSERT WITH CHECK (("auth"."uid"() = "userId"));



CREATE POLICY "Allow individual update access" ON "public"."User" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."Food" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."FoodLog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."RecommendedDailyAllowance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."Food" TO "anon";
GRANT ALL ON TABLE "public"."Food" TO "authenticated";
GRANT ALL ON TABLE "public"."Food" TO "service_role";



GRANT ALL ON TABLE "public"."FoodLog" TO "anon";
GRANT ALL ON TABLE "public"."FoodLog" TO "authenticated";
GRANT ALL ON TABLE "public"."FoodLog" TO "service_role";



GRANT ALL ON TABLE "public"."Profile" TO "anon";
GRANT ALL ON TABLE "public"."Profile" TO "authenticated";
GRANT ALL ON TABLE "public"."Profile" TO "service_role";



GRANT ALL ON TABLE "public"."RecommendedDailyAllowance" TO "anon";
GRANT ALL ON TABLE "public"."RecommendedDailyAllowance" TO "authenticated";
GRANT ALL ON TABLE "public"."RecommendedDailyAllowance" TO "service_role";



GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
