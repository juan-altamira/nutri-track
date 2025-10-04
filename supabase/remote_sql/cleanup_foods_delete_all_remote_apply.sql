-- Remote apply: eliminar TODOS los alimentos globales
-- Afecta solo a public."Food"; por cascada se eliminan sus nutrientes en "FoodNutrient" y registros en "FoodLog".
-- NO toca tablas de alimentos de usuario ("UserFood", "UserFoodNutrient").

BEGIN;

DO $$
BEGIN
  -- Verificar existencia de la tabla Food
  IF to_regclass('public."Food"') IS NULL THEN
    RAISE NOTICE 'Tabla public.Food no existe. Nada para limpiar.';
    RETURN;
  END IF;

  -- Eliminar todos los alimentos globales
  DELETE FROM public."Food";

  RAISE NOTICE 'Limpieza completada: todos los alimentos globales eliminados (con cascada a FoodNutrient y FoodLog).';
END; $$;

COMMIT;
