-- Remote check: conteo de tablas de alimentos globales
SELECT
  (SELECT count(*) FROM public."Food") AS food_count,
  (SELECT count(*) FROM public."FoodNutrient") AS foodnutrient_count;
