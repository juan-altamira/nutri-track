-- Upsert RDAs for B5, B7 and Choline for age groups 19-50 and 51-70 (sex-specific where applicable)
-- Postgres 15 safe using MERGE
BEGIN;

-- Vitamin B5 (pantothenic acid) - same for both sexes
MERGE INTO "RecommendedDailyAllowance" AS t
USING (
  VALUES
    ('vitaminB5', '19-50', NULL::public."Sex", 5::real,  'mg'),
    ('vitaminB5', '51-70', NULL::public."Sex", 5::real,  'mg')
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

-- Vitamin B7 (biotin) - same for both sexes
MERGE INTO "RecommendedDailyAllowance" AS t
USING (
  VALUES
    ('vitaminB7', '19-50', NULL::public."Sex", 30::real,  'µg'),
    ('vitaminB7', '51-70', NULL::public."Sex", 30::real,  'µg')
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

-- Choline - sex-specific
MERGE INTO "RecommendedDailyAllowance" AS t
USING (
  VALUES
    ('choline', '19-50', 'MALE'::public."Sex",   550::real, 'mg'),
    ('choline', '19-50', 'FEMALE'::public."Sex", 425::real, 'mg'),
    ('choline', '51-70', 'MALE'::public."Sex",   550::real, 'mg'),
    ('choline', '51-70', 'FEMALE'::public."Sex", 425::real, 'mg')
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
