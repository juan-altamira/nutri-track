-- Actualizar función de búsqueda de alimentos globales para incluir macronutrientes
-- Esta función busca en la tabla Food ignorando acentos y obtiene los nutrientes desde FoodNutrient

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS public.search_foods_normalized(text);

-- Crear la función con los nuevos campos
CREATE FUNCTION public.search_foods_normalized(search_term TEXT)
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
    f.id,
    f.name,
    MAX(CASE WHEN fn.nutrient = 'protein' THEN fn.value ELSE NULL END) as protein,
    MAX(CASE WHEN fn.nutrient = 'carbohydrates' THEN fn.value ELSE NULL END) as carbs,
    MAX(CASE WHEN fn.nutrient = 'fat' THEN fn.value ELSE NULL END) as fat,
    NULL::NUMERIC as calories -- Calorías se calculan en el frontend
  FROM public."Food" f
  LEFT JOIN public."FoodNutrient" fn ON f.id = fn."foodId" 
    AND fn.nutrient IN ('protein', 'carbohydrates', 'fat')
  WHERE public.normalize_text(f.name) LIKE '%' || public.normalize_text(search_term) || '%'
  GROUP BY f.id, f.name
  ORDER BY f.name
  LIMIT 10;
END;
$$;

-- Actualizar función de búsqueda de alimentos de usuario para incluir macronutrientes
-- Esta función busca en la tabla UserFood ignorando acentos y obtiene los nutrientes desde UserFoodNutrient

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
    MAX(CASE WHEN ufn.nutrient = 'protein' THEN ufn.value ELSE NULL END) as protein,
    MAX(CASE WHEN ufn.nutrient = 'carbohydrates' THEN ufn.value ELSE NULL END) as carbs,
    MAX(CASE WHEN ufn.nutrient = 'fat' THEN ufn.value ELSE NULL END) as fat,
    NULL::NUMERIC as calories -- Calorías se calculan en el frontend
  FROM public."UserFood" uf
  LEFT JOIN public."UserFoodNutrient" ufn ON uf.id = ufn."userFoodId" 
    AND ufn.nutrient IN ('protein', 'carbohydrates', 'fat')
  WHERE public.normalize_text(uf.name) LIKE '%' || public.normalize_text(search_term) || '%'
  GROUP BY uf.id, uf.name
  ORDER BY uf.name
  LIMIT 10;
END;
$$;

-- Comentarios para documentación
COMMENT ON FUNCTION public.search_foods_normalized IS 'Busca alimentos en la tabla Food ignorando acentos y devuelve información nutricional básica';
COMMENT ON FUNCTION public.search_userfoods_normalized IS 'Busca alimentos personalizados en UserFood ignorando acentos y devuelve información nutricional básica';
