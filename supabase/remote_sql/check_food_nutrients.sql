-- Verificar si los alimentos tienen nutrientes cargados
-- Ejecuta esto para ver qué alimentos tienen datos

-- Ver cuántos alimentos hay
SELECT COUNT(*) as total_foods FROM public."Food";

-- Ver los nutrientes de un alimento específico (ejemplo: milanesa)
SELECT 
  f.name as alimento,
  fn.nutrient as nutriente,
  fn.value as valor,
  fn.unit as unidad
FROM public."Food" f
LEFT JOIN public."FoodNutrient" fn ON f.id = fn."foodId"
WHERE LOWER(f.name) LIKE '%milanesa%'
ORDER BY f.name, fn.nutrient;

-- Ver todos los alimentos con sus macronutrientes
SELECT 
  f.name as alimento,
  MAX(CASE WHEN fn.nutrient = 'protein' THEN fn.value ELSE NULL END) as proteina,
  MAX(CASE WHEN fn.nutrient = 'carbohydrates' THEN fn.value ELSE NULL END) as carbohidratos,
  MAX(CASE WHEN fn.nutrient = 'fat' THEN fn.value ELSE NULL END) as grasa,
  MAX(CASE WHEN fn.nutrient = 'calories' THEN fn.value ELSE NULL END) as calorias
FROM public."Food" f
LEFT JOIN public."FoodNutrient" fn ON f.id = fn."foodId" 
  AND fn.nutrient IN ('protein', 'carbohydrates', 'fat', 'calories')
GROUP BY f.id, f.name
ORDER BY f.name
LIMIT 20;
