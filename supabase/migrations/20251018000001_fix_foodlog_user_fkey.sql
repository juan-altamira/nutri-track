-- Eliminar el constraint incorrecto que apunta a public.User
ALTER TABLE "public"."FoodLog"
DROP CONSTRAINT IF EXISTS "FoodLog_userId_fkey";

-- Eliminar la tabla User si existe (ya no la necesitamos)
DROP TABLE IF EXISTS "public"."User" CASCADE;

-- Asegurarnos de que userId es UUID para coincidir con auth.users
ALTER TABLE "public"."FoodLog"
ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;

-- Crear el constraint correcto que apunta a auth.users
ALTER TABLE "public"."FoodLog"
ADD CONSTRAINT "FoodLog_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "auth"."users"("id") 
ON DELETE CASCADE;

-- Comentario para documentación
COMMENT ON CONSTRAINT "FoodLog_userId_fkey" ON "public"."FoodLog" 
IS 'Foreign key hacia auth.users (sistema de autenticación de Supabase)';
