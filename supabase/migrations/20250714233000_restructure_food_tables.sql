-- Paso 1: Eliminar la dependencia de FoodLog temporalmente.
ALTER TABLE "public"."FoodLog" DROP CONSTRAINT IF EXISTS "FoodLog_foodId_fkey";

-- Paso 2: Cambiar el tipo de la columna id en la tabla Food a uuid.
ALTER TABLE "public"."Food" DROP CONSTRAINT IF EXISTS "Food_pkey" CASCADE;
ALTER TABLE "public"."Food" ALTER COLUMN "id" SET DATA TYPE uuid USING (gen_random_uuid());
ALTER TABLE "public"."Food" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."Food" ADD PRIMARY KEY (id);

-- Paso 3: Ajustar FoodLog para que use uuid y recrear la dependencia.
ALTER TABLE "public"."FoodLog" ALTER COLUMN "foodId" SET DATA TYPE uuid USING (gen_random_uuid());
ALTER TABLE "public"."FoodLog" ADD CONSTRAINT "FoodLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"(id) ON DELETE CASCADE;

-- Paso 4: Simplificar la tabla Food eliminando las columnas de macronutrientes.
ALTER TABLE "public"."Food"
DROP COLUMN IF EXISTS "protein",
DROP COLUMN IF EXISTS "carbohydrates",
DROP COLUMN IF EXISTS "fat",
DROP COLUMN IF EXISTS "calories";

-- Paso 5: Crear la nueva tabla FoodNutrient.
CREATE TABLE IF NOT EXISTS "public"."FoodNutrient" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "foodId" uuid NOT NULL,
    "nutrient" text NOT NULL,
    "value" numeric NOT NULL,
    "unit" text NOT NULL,
    CONSTRAINT "FoodNutrient_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FoodNutrient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE CASCADE
);

-- Comentarios para documentación de la base de datos
COMMENT ON TABLE "public"."FoodNutrient" IS 'Almacena el valor de un nutriente específico para un alimento determinado.';
COMMENT ON COLUMN "public"."FoodNutrient"."foodId" IS 'Enlace al alimento en la tabla Food.';
COMMENT ON COLUMN "public"."FoodNutrient"."nutrient" IS 'Nombre del nutriente (ej. protein, vitaminC). Debe coincidir con RecommendedDailyAllowance.nutrient.';
COMMENT ON COLUMN "public"."FoodNutrient"."value" IS 'Cantidad del nutriente por cada 100g del alimento.';
COMMENT ON COLUMN "public"."FoodNutrient"."unit" IS 'Unidad de medida (g, mg, µg).';
