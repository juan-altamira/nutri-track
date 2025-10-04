-- Upsert RDAs for 19-50 core vitamins (Vitamin D, K, B6, B12)
-- Postgres 15 safe using MERGE with IS NOT DISTINCT FROM for sex NULL
BEGIN;

MERGE INTO "RecommendedDailyAllowance" AS t
USING (
  VALUES
    -- Vitamin D
    ('vitaminD',  '19-50', NULL::public."Sex", 15::real,  'µg'),
    -- Vitamin K
    ('vitaminK',  '19-50', 'MALE'::public."Sex",   120::real, 'µg'),
    ('vitaminK',  '19-50', 'FEMALE'::public."Sex", 90::real,  'µg'),
    -- Vitamin B6
    ('vitaminB6', '19-50', NULL::public."Sex", 1.3::real, 'mg'),
    -- Vitamin B12
    ('vitaminB12','19-50', NULL::public."Sex", 2.4::real, 'µg')
) AS s(nutrient, ageGroup, sex, value, unit)
ON (
  t.nutrient = s.nutrient
  AND t."ageGroup" = s.ageGroup
  AND (t.sex IS NOT DISTINCT FROM s.sex)
)
WHEN MATCHED THEN
  UPDATE SET value = s.value, unit = s.unit
WHEN NOT MATCHED THEN
  INSERT (nutrient, "ageGroup", sex, value, unit)
  VALUES (s.nutrient, s.ageGroup, s.sex, s.value, s.unit);

COMMIT;
