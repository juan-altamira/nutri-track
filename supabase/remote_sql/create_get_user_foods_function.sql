-- Crear función para obtener todos los alimentos del usuario autenticado
-- con sus macronutrientes desde UserFoodNutrient

CREATE OR REPLACE FUNCTION public.get_user_foods_with_macros()
RETURNS TABLE (
  id UUID,
  name TEXT,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  calories NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
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
  WHERE uf."userId" = auth.uid()
  GROUP BY uf.id, uf.name
  ORDER BY uf.name;
END;
$$;

COMMENT ON FUNCTION public.get_user_foods_with_macros IS 'Obtiene todos los alimentos del usuario autenticado con macronutrientes';
