-- Remote apply: eliminar todos los alimentos globales excepto "semillas de chia"
-- Seguro e idempotente. ABORTA si no encuentra un alimento con nombre "semillas de chia" o "semillas de chía" (ignora mayúsculas/minúsculas)
-- No inserta datos nuevos. Solo elimina filas de public."Food" y, por cascada, de "FoodNutrient" y registros de "FoodLog" asociados.

BEGIN;

DO $$
DECLARE
  v_keep_count integer;
BEGIN
  -- Verificar existencia de la tabla Food
  IF to_regclass('public."Food"') IS NULL THEN
    RAISE NOTICE 'Tabla public.Food no existe. Nada para limpiar.';
    RETURN;
  END IF;

  -- Crear tabla temporal con los IDs a conservar (coincidencias exactas por nombre esperado, tolerando acento y mayúsculas/minúsculas)
  CREATE TEMP TABLE tmp_keep_food_ids ON COMMIT DROP AS
  SELECT id
  FROM public."Food"
  WHERE trim(lower(name)) IN (
    'semillas de chia',   -- sin acento
    'semillas de chía'    -- con acento
  );

  SELECT COUNT(*) INTO v_keep_count FROM tmp_keep_food_ids;

  -- Abortar por seguridad si no hay coincidencias; evita borrar todo accidentalmente
  IF v_keep_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ningún alimento con nombre "semillas de chia" (con o sin acento). Limpieza abortada por seguridad.';
  END IF;

  -- Eliminar todos los alimentos excepto los seleccionados
  DELETE FROM public."Food" f
  WHERE NOT EXISTS (
    SELECT 1 FROM tmp_keep_food_ids k WHERE k.id = f.id
  );

  RAISE NOTICE 'Limpieza completada. Conservados: % registro(s).', v_keep_count;
END; $$;

COMMIT;
