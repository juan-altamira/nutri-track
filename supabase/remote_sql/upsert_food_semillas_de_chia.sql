-- Upsert alimento global: Semillas de chia (100 g)
-- Calorías de referencia (NO se guardan): 16.54*4 + 42.12*4 + 30.74*9 = 511.3 kcal
-- Solo se incluyen nutrientes soportados y con valor > 0. Unidades normalizadas a g, mg o µg según catálogo.

BEGIN;

SELECT public.upsert_global_food(
  'Semillas de chia',
  '[
    {"nutrient":"protein","value":16.54,"unit":"g"},
    {"nutrient":"carbohydrates","value":42.12,"unit":"g"},
    {"nutrient":"fat","value":30.74,"unit":"g"},
    {"nutrient":"fiber","value":34.4,"unit":"g"},

    {"nutrient":"vitaminA","value":16.2,"unit":"µg"},
    {"nutrient":"vitaminC","value":1.6,"unit":"mg"},
    {"nutrient":"vitaminE","value":0.5,"unit":"mg"},
    {"nutrient":"vitaminB1","value":0.62,"unit":"mg"},
    {"nutrient":"vitaminB2","value":0.17,"unit":"mg"},
    {"nutrient":"vitaminB3","value":8.83,"unit":"mg"},
    {"nutrient":"folate","value":49,"unit":"µg"},

    {"nutrient":"calcium","value":631,"unit":"mg"},
    {"nutrient":"iron","value":7.72,"unit":"mg"},
    {"nutrient":"magnesium","value":335,"unit":"mg"},
    {"nutrient":"zinc","value":4.58,"unit":"mg"},
    {"nutrient":"potassium","value":407,"unit":"mg"},
    {"nutrient":"sodium","value":16,"unit":"mg"},
    {"nutrient":"phosphorus","value":860,"unit":"mg"},
    {"nutrient":"selenium","value":55.2,"unit":"µg"},
    {"nutrient":"copper","value":924,"unit":"µg"},
    {"nutrient":"manganese","value":2.723,"unit":"mg"}
  ]'::jsonb
) AS food_id;

COMMIT;
