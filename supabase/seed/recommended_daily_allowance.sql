-- Seed data for RecommendedDailyAllowance table
-- Covers macros, vitamins and minerals for key ageGroups (4-8, 14-18, 19-50, 71+) and sexes (MALE, FEMALE or NULL when value is identical)
-- Units are g (grams), mg (milligrams), µg (micrograms)
-- NOTE: Run this in Supabase SQL editor or via psql.

-- =================
-- MACRONUTRIENTS
-- =================
insert into "RecommendedDailyAllowance" (nutrient, value, unit, ageGroup, sex) values
-- Protein
('protein', 19, 'g', '4-8', null),
('protein', 52, 'g', '14-18', 'MALE'),
('protein', 46, 'g', '14-18', 'FEMALE'),
('protein', 56, 'g', '19-50', 'MALE'),
('protein', 46, 'g', '19-50', 'FEMALE'),
('protein', 56, 'g', '71+', 'MALE'),
('protein', 46, 'g', '71+', 'FEMALE'),
-- Carbohydrates
('carbohydrates', 130, 'g', '4-8', null),
('carbohydrates', 130, 'g', '14-18', null),
('carbohydrates', 130, 'g', '19-50', null),
('carbohydrates', 130, 'g', '71+', null),
-- Fat (total)
('fat', 38, 'g', '4-8', null),
('fat', 78, 'g', '14-18', null),
('fat', 78, 'g', '19-50', null),
('fat', 78, 'g', '71+', null),
-- Fiber
('fiber', 25, 'g', '4-8', null),
('fiber', 38, 'g', '14-18', 'MALE'),
('fiber', 26, 'g', '14-18', 'FEMALE'),
('fiber', 38, 'g', '19-50', 'MALE'),
('fiber', 25, 'g', '19-50', 'FEMALE'),
('fiber', 30, 'g', '71+', 'MALE'),
('fiber', 21, 'g', '71+', 'FEMALE');

-- =================
-- VITAMINS
-- =================
insert into "RecommendedDailyAllowance" (nutrient, value, unit, ageGroup, sex) values
-- Vitamin A
('vitaminA', 400, 'µg', '4-8', null),
('vitaminA', 900, 'µg', '14-18', 'MALE'),
('vitaminA', 700, 'µg', '14-18', 'FEMALE'),
('vitaminA', 900, 'µg', '19-50', 'MALE'),
('vitaminA', 700, 'µg', '19-50', 'FEMALE'),
('vitaminA', 900, 'µg', '71+', 'MALE'),
('vitaminA', 700, 'µg', '71+', 'FEMALE'),
-- Vitamin C
('vitaminC', 25, 'mg', '4-8', null),
('vitaminC', 75, 'mg', '14-18', 'MALE'),
('vitaminC', 65, 'mg', '14-18', 'FEMALE'),
('vitaminC', 90, 'mg', '19-50', 'MALE'),
('vitaminC', 75, 'mg', '19-50', 'FEMALE'),
('vitaminC', 90, 'mg', '71+', 'MALE'),
('vitaminC', 75, 'mg', '71+', 'FEMALE'),
-- Vitamin D
('vitaminD', 15, 'µg', '4-8', null),
('vitaminD', 15, 'µg', '14-18', null),
('vitaminD', 15, 'µg', '19-50', null),
('vitaminD', 20, 'µg', '71+', null),
-- Vitamin E
('vitaminE', 7,  'mg', '4-8', null),
('vitaminE', 15, 'mg', '14-18', null),
('vitaminE', 15, 'mg', '19-50', null),
('vitaminE', 15, 'mg', '71+', null),
-- Vitamin K
('vitaminK', 55,  'µg', '4-8', null),
('vitaminK', 60,  'µg', '14-18', 'MALE'),
('vitaminK', 75,  'µg', '14-18', 'FEMALE'),
('vitaminK', 120, 'µg', '19-50', 'MALE'),
('vitaminK', 90,  'µg', '19-50', 'FEMALE'),
('vitaminK', 120, 'µg', '71+', 'MALE'),
('vitaminK', 90,  'µg', '71+', 'FEMALE'),
-- Vitamin B1 (Thiamin)
('vitaminB1', 0.6, 'mg', '4-8', null),
('vitaminB1', 1.2, 'mg', '14-18', 'MALE'),
('vitaminB1', 1.0, 'mg', '14-18', 'FEMALE'),
('vitaminB1', 1.2, 'mg', '19-50', 'MALE'),
('vitaminB1', 1.1, 'mg', '19-50', 'FEMALE'),
('vitaminB1', 1.2, 'mg', '71+', 'MALE'),
('vitaminB1', 1.1, 'mg', '71+', 'FEMALE'),
-- Vitamin B2 (Riboflavin)
('vitaminB2', 0.6, 'mg', '4-8', null),
('vitaminB2', 1.3, 'mg', '14-18', 'MALE'),
('vitaminB2', 1.0, 'mg', '14-18', 'FEMALE'),
('vitaminB2', 1.3, 'mg', '19-50', 'MALE'),
('vitaminB2', 1.1, 'mg', '19-50', 'FEMALE'),
('vitaminB2', 1.3, 'mg', '71+', 'MALE'),
('vitaminB2', 1.1, 'mg', '71+', 'FEMALE'),
-- Vitamin B3 (Niacin, NE)
('vitaminB3', 8,  'mg', '4-8', null),
('vitaminB3', 16, 'mg', '14-18', 'MALE'),
('vitaminB3', 14, 'mg', '14-18', 'FEMALE'),
('vitaminB3', 16, 'mg', '19-50', 'MALE'),
('vitaminB3', 14, 'mg', '19-50', 'FEMALE'),
('vitaminB3', 16, 'mg', '71+', 'MALE'),
('vitaminB3', 14, 'mg', '71+', 'FEMALE'),
-- Vitamin B6
('vitaminB6', 0.6, 'mg', '4-8', null),
('vitaminB6', 1.3, 'mg', '14-18', 'MALE'),
('vitaminB6', 1.2, 'mg', '14-18', 'FEMALE'),
('vitaminB6', 1.3, 'mg', '19-50', null),
('vitaminB6', 1.7, 'mg', '71+', 'MALE'),
('vitaminB6', 1.5, 'mg', '71+', 'FEMALE'),
-- Folate
('folate', 200, 'µg', '4-8', null),
('folate', 400, 'µg', '14-18', null),
('folate', 400, 'µg', '19-50', null),
('folate', 400, 'µg', '71+', null),
-- Vitamin B12
('vitaminB12', 1.2, 'µg', '4-8', null),
('vitaminB12', 1.8, 'µg', '14-18', null),
('vitaminB12', 2.4, 'µg', '19-50', null),
('vitaminB12', 2.4, 'µg', '71+', null);

-- =================
-- MINERALS (sample subset)
-- =================
insert into "RecommendedDailyAllowance" (nutrient, value, unit, ageGroup, sex) values
-- Calcium
('calcium', 1000, 'mg', '4-8', null),
('calcium', 1300, 'mg', '14-18', null),
('calcium', 1000, 'mg', '19-50', null),
('calcium', 1200, 'mg', '71+', null),
-- Iron
('iron', 10, 'mg', '4-8', null),
('iron', 11, 'mg', '14-18', 'MALE'),
('iron', 15, 'mg', '14-18', 'FEMALE'),
('iron', 8, 'mg', '19-50', 'MALE'),
('iron', 18, 'mg', '19-50', 'FEMALE'),
('iron', 8, 'mg', '71+', null),
-- Magnesium
('magnesium', 130, 'mg', '4-8', null),
('magnesium', 410, 'mg', '14-18', 'MALE'),
('magnesium', 360, 'mg', '14-18', 'FEMALE'),
('magnesium', 420, 'mg', '19-50', 'MALE'),
('magnesium', 320, 'mg', '19-50', 'FEMALE'),
('magnesium', 420, 'mg', '71+', 'MALE'),
('magnesium', 320, 'mg', '71+', 'FEMALE'),
-- Zinc
('zinc', 5, 'mg', '4-8', null),
('zinc', 11, 'mg', '14-18', 'MALE'),
('zinc', 9, 'mg', '14-18', 'FEMALE'),
('zinc', 11, 'mg', '19-50', 'MALE'),
('zinc', 8, 'mg', '19-50', 'FEMALE'),
('zinc', 11, 'mg', '71+', 'MALE'),
('zinc', 8, 'mg', '71+', 'FEMALE');

-- ⇢ Añade el resto de minerales siguiendo el mismo patrón
