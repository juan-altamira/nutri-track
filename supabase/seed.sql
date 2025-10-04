-- Semilla para RecommendedDailyAllowance (los IDs son autogenerados)
INSERT INTO "public"."RecommendedDailyAllowance" (nutrient, "ageGroup", sex, value, unit) VALUES
('calories', '19-30', 'MALE', 2400, 'kcal'),
('calories', '19-30', 'FEMALE', 2000, 'kcal'),
('protein', '19-70', NULL, 50, 'g'),
('carbohydrates', '19-70', NULL, 130, 'g'),
('fat', '19-70', NULL, 65, 'g'),
('vitaminA', '19-70', 'MALE', 900, 'mcg'),
('vitaminA', '19-70', 'FEMALE', 700, 'mcg'),
('vitaminC', '19-70', 'MALE', 90, 'mg'),
('vitaminC', '19-70', 'FEMALE', 75, 'mg');

-- Semilla para Food y FoodNutrient usando CTEs para inserciones atómicas

-- Pollo
WITH food_insert AS (
  INSERT INTO "public"."Food" (name, source) VALUES ('Chicken Breast (cooked)', 'GLOBAL') RETURNING id
)
INSERT INTO "public"."FoodNutrient" ("foodId", nutrient, value, unit)
SELECT id, 'protein', 31, 'g' FROM food_insert UNION ALL
SELECT id, 'carbohydrates', 0, 'g' FROM food_insert UNION ALL
SELECT id, 'fat', 3.6, 'g' FROM food_insert UNION ALL
SELECT id, 'calories', 165, 'kcal' FROM food_insert;

-- Arroz Integral
WITH food_insert AS (
  INSERT INTO "public"."Food" (name, source) VALUES ('Brown Rice (cooked)', 'GLOBAL') RETURNING id
)
INSERT INTO "public"."FoodNutrient" ("foodId", nutrient, value, unit)
SELECT id, 'protein', 2.6, 'g' FROM food_insert UNION ALL
SELECT id, 'carbohydrates', 23, 'g' FROM food_insert UNION ALL
SELECT id, 'fat', 0.9, 'g' FROM food_insert UNION ALL
SELECT id, 'calories', 111, 'kcal' FROM food_insert;

-- Brócoli
WITH food_insert AS (
  INSERT INTO "public"."Food" (name, source) VALUES ('Broccoli (raw)', 'GLOBAL') RETURNING id
)
INSERT INTO "public"."FoodNutrient" ("foodId", nutrient, value, unit)
SELECT id, 'protein', 2.8, 'g' FROM food_insert UNION ALL
SELECT id, 'carbohydrates', 6.6, 'g' FROM food_insert UNION ALL
SELECT id, 'fat', 0.4, 'g' FROM food_insert UNION ALL
SELECT id, 'calories', 34, 'kcal' FROM food_insert;
