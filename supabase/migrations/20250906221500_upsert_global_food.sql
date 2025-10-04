-- Migration: crear función de upsert de alimentos globales y asegurar índice único
BEGIN;

-- Índice único por (foodId, nutrient) para idempotencia del upsert
CREATE UNIQUE INDEX IF NOT EXISTS "FoodNutrient_unique_per_food" ON public."FoodNutrient" ("foodId", "nutrient");

-- Función de upsert idempotente y validada
CREATE OR REPLACE FUNCTION public.upsert_global_food(p_name text, p_nutrients jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_food_id uuid;
  v_item jsonb;
  v_nutrient text;
  v_value numeric;
  v_unit text;
  v_allowed text[] := ARRAY[
    'protein','carbohydrates','fat','fiber',
    'vitaminA','vitaminC','vitaminD','vitaminE','vitaminK',
    'vitaminB1','vitaminB2','vitaminB3','vitaminB6','vitaminB12','folate',
    'calcium','iron','magnesium','zinc','potassium','sodium','phosphorus','selenium','copper','manganese','iodine'
  ];
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Nombre de alimento inválido';
  END IF;
  IF p_nutrients IS NULL OR jsonb_typeof(p_nutrients) <> 'array' THEN
    RAISE EXCEPTION 'p_nutrients debe ser un arreglo JSONB de objetos {nutrient,value,unit}';
  END IF;

  -- Obtener o crear el alimento por nombre
  SELECT f.id INTO v_food_id
  FROM public."Food" f
  WHERE lower(trim(f.name)) = lower(trim(p_name))
  LIMIT 1;

  IF v_food_id IS NULL THEN
    INSERT INTO public."Food" (name) VALUES (p_name) RETURNING id INTO v_food_id;
  END IF;

  -- Recorrer nutrientes y upsert
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_nutrients)
  LOOP
    v_nutrient := (v_item->>'nutrient');
    v_value := (v_item->>'value')::numeric;
    v_unit := coalesce((v_item->>'unit'),'');

    IF v_nutrient IS NULL OR v_nutrient = '' THEN
      RAISE EXCEPTION 'Nutriente sin nombre en entrada';
    END IF;
    IF NOT (v_nutrient = ANY (v_allowed)) THEN
      RAISE EXCEPTION 'Nutriente no permitido: % (use clave canónica exacta)', v_nutrient;
    END IF;

    v_unit := lower(trim(replace(v_unit,'μ','µ')));
    IF v_unit NOT IN ('g','mg','µg') THEN
      RAISE EXCEPTION 'Unidad inválida para %: %, use g, mg o µg', v_nutrient, v_unit;
    END IF;
    IF v_value IS NULL OR v_value < 0 THEN
      RAISE EXCEPTION 'Valor inválido para %: %', v_nutrient, coalesce(v_value::text,'NULL');
    END IF;

    INSERT INTO public."FoodNutrient" ("foodId", nutrient, value, unit)
    VALUES (v_food_id, v_nutrient, v_value, v_unit)
    ON CONFLICT ("foodId", nutrient) DO UPDATE
    SET value = EXCLUDED.value,
        unit = EXCLUDED.unit;
  END LOOP;

  RETURN v_food_id;
END;
$$;

COMMIT;
