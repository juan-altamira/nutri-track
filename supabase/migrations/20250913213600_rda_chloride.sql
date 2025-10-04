-- Upsert RDAs for Chloride (Cloruro) for age groups 19-50 and 51-70
-- Values provided in g/d were converted to mg/d to match app units
-- 19–50: 2.3 g/d => 2300 mg/d (sex-neutral)
-- 51–70: 2.0 g/d => 2000 mg/d (sex-neutral)

BEGIN;

MERGE INTO "RecommendedDailyAllowance" AS t
USING (
  VALUES
    ('chloride', '19-50', NULL::public."Sex", 2300::real, 'mg'),
    ('chloride', '51-70', NULL::public."Sex", 2000::real, 'mg')
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
