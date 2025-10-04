-- Migration: eliminar todos los alimentos globales excepto "semillas de chia"
-- Seguro e idempotente; aborta si no encuentra el alimento a conservar
BEGIN;

DO $$
DECLARE
  v_keep_count integer;
BEGIN
  IF to_regclass('public."Food"') IS NULL THEN
    RAISE NOTICE 'Tabla public.Food no existe. Nada para limpiar.';
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_keep_food_ids ON COMMIT DROP AS
  SELECT id
  FROM public."Food"
  WHERE trim(lower(name)) IN ('semillas de chia', 'semillas de chía');

  SELECT COUNT(*) INTO v_keep_count FROM tmp_keep_food_ids;
  IF v_keep_count = 0 THEN
    RAISE EXCEPTION 'No se encontró "semillas de chia" (con o sin acento). Limpieza abortada por seguridad.';
  END IF;

  DELETE FROM public."Food" f
  WHERE NOT EXISTS (SELECT 1 FROM tmp_keep_food_ids k WHERE k.id = f.id);
END; $$;

COMMIT;
