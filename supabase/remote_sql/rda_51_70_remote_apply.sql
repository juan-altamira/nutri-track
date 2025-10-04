-- Upsert RDAs for ageGroup '51-70' (Postgres 15 safe)
-- Incluye macronutrientes y vitaminas D, K, B6 y B12
-- Idempotente usando MERGE con comparaciones IS NOT DISTINCT FROM (soporta NULL en sex)

BEGIN;

MERGE INTO "RecommendedDailyAllowance" AS t
USING (
  VALUES
    -- Macronutrientes
    ('protein',        '51-70', 'MALE'::public."Sex",   56::real,  'g'),
    ('protein',        '51-70', 'FEMALE'::public."Sex", 46::real,  'g'),
    ('carbohydrates',  '51-70', NULL::public."Sex",     130::real, 'g'),
    ('fat',            '51-70', NULL::public."Sex",     78::real,  'g'),
    ('fiber',          '51-70', 'MALE'::public."Sex",   30::real,  'g'),
    ('fiber',          '51-70', 'FEMALE'::public."Sex", 21::real,  'g'),

    -- Vitaminas solicitadas
    ('vitaminD',       '51-70', NULL::public."Sex",     15::real,  'µg'), -- 600 IU
    ('vitaminK',       '51-70', 'MALE'::public."Sex",   120::real, 'µg'),
    ('vitaminK',       '51-70', 'FEMALE'::public."Sex", 90::real,  'µg'),
    ('vitaminB6',      '51-70', 'MALE'::public."Sex",   1.7::real, 'mg'),
    ('vitaminB6',      '51-70', 'FEMALE'::public."Sex", 1.5::real, 'mg'),
    ('vitaminB12',     '51-70', NULL::public."Sex",     2.4::real, 'µg'),

    -- Otras vitaminas 51-70
    ('vitaminA',       '51-70', 'MALE'::public."Sex",   900::real, 'µg'),
    ('vitaminA',       '51-70', 'FEMALE'::public."Sex", 700::real, 'µg'),
    ('vitaminC',       '51-70', 'MALE'::public."Sex",   90::real,  'mg'),
    ('vitaminC',       '51-70', 'FEMALE'::public."Sex", 75::real,  'mg'),
    ('vitaminE',       '51-70', NULL::public."Sex",     15::real,  'mg'),
    ('vitaminB1',      '51-70', 'MALE'::public."Sex",   1.2::real, 'mg'),
    ('vitaminB1',      '51-70', 'FEMALE'::public."Sex", 1.1::real, 'mg'),
    ('vitaminB2',      '51-70', 'MALE'::public."Sex",   1.3::real, 'mg'),
    ('vitaminB2',      '51-70', 'FEMALE'::public."Sex", 1.1::real, 'mg'),
    ('vitaminB3',      '51-70', 'MALE'::public."Sex",   16::real,  'mg'),
    ('vitaminB3',      '51-70', 'FEMALE'::public."Sex", 14::real,  'mg'),
    ('folate',         '51-70', NULL::public."Sex",     400::real, 'µg'),

    -- Minerales clave usados por la UI
    ('calcium',        '51-70', 'MALE'::public."Sex",   1000::real, 'mg'),
    ('calcium',        '51-70', 'FEMALE'::public."Sex", 1200::real, 'mg'),
    ('iron',           '51-70', NULL::public."Sex",     8::real,    'mg'),
    ('magnesium',      '51-70', 'MALE'::public."Sex",   420::real,  'mg'),
    ('magnesium',      '51-70', 'FEMALE'::public."Sex", 320::real,  'mg'),
    ('zinc',           '51-70', 'MALE'::public."Sex",   11::real,   'mg'),
    ('zinc',           '51-70', 'FEMALE'::public."Sex", 8::real,    'mg'),
    ('potassium',      '51-70', 'MALE'::public."Sex",   3400::real, 'mg'),
    ('potassium',      '51-70', 'FEMALE'::public."Sex", 2600::real, 'mg'),
    ('sodium',         '51-70', NULL::public."Sex",     1300::real, 'mg'),
    ('phosphorus',     '51-70', NULL::public."Sex",     700::real,  'mg'),
    ('selenium',       '51-70', NULL::public."Sex",     55::real,   'µg'),
    ('copper',         '51-70', NULL::public."Sex",     900::real,  'µg'),
    ('manganese',      '51-70', 'MALE'::public."Sex",   2.3::real,  'mg'),
    ('manganese',      '51-70', 'FEMALE'::public."Sex", 1.8::real,  'mg'),
    ('iodine',         '51-70', NULL::public."Sex",     150::real,  'µg')
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
