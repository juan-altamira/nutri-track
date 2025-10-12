-- Actualizar función de búsqueda de alimentos globales para incluir macronutrientes
-- Esta función busca en la tabla Food ignorando acentos

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS public.search_foods_normalized(text);

-- Crear la función con los nuevos campos
CREATE FUNCTION public.search_foods_normalized(search_term TEXT)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  calories NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.protein,
    f.carbs,
    f.fat,
    f.calories
  FROM public."Food" f
  WHERE public.normalize_text(f.name) LIKE '%' || public.normalize_text(search_term) || '%'
  ORDER BY f.name
  LIMIT 10;
END;
$$;

-- Actualizar función de búsqueda de alimentos de usuario para incluir macronutrientes
-- Esta función busca en la tabla UserFood ignorando acentos

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS public.search_userfoods_normalized(text);

-- Crear la función con los nuevos campos
CREATE FUNCTION public.search_userfoods_normalized(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  calories NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uf.id,
    uf.name,
    uf.protein,
    uf.carbs,
    uf.fat,
    uf.calories
  FROM public."UserFood" uf
  WHERE public.normalize_text(uf.name) LIKE '%' || public.normalize_text(search_term) || '%'
  ORDER BY uf.name
  LIMIT 10;
END;
$$;

-- Comentarios para documentación
COMMENT ON FUNCTION public.search_foods_normalized IS 'Busca alimentos en la tabla Food ignorando acentos y devuelve información nutricional básica';
COMMENT ON FUNCTION public.search_userfoods_normalized IS 'Busca alimentos personalizados en UserFood ignorando acentos y devuelve información nutricional básica';
