-- ============================================================================
-- USDA FoodData Central Integration Schema
-- ============================================================================
-- Propósito: Importar datos de USDA FDC manteniendo trazabilidad y calidad
-- Reversible: DROP SCHEMA fdc CASCADE;
-- ============================================================================

-- Crear schema separado para FDC (facilita rollback)
CREATE SCHEMA IF NOT EXISTS fdc;

-- ============================================================================
-- 1. Catálogo de Nutrientes (normalizado)
-- ============================================================================
CREATE TABLE fdc.nutrients (
  id BIGSERIAL PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL,              -- 'vitaminA', 'calcium', 'protein'
  fdc_nutrient_id INT UNIQUE,            -- ID de FDC para mapeo
  name_en TEXT NOT NULL,                 -- 'Vitamin A, RAE'
  name_es TEXT,                          -- 'Vitamina A, RAE'
  unit TEXT NOT NULL,                    -- 'µg', 'mg', 'g', 'kcal'
  category TEXT,                         -- 'vitamin', 'mineral', 'macro'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE fdc.nutrients IS 'Catálogo normalizado de nutrientes. Mapea FDC IDs a nuestros tags internos.';
COMMENT ON COLUMN fdc.nutrients.tag IS 'Tag interno usado en nuestra app (ej: vitaminA, calcium)';
COMMENT ON COLUMN fdc.nutrients.fdc_nutrient_id IS 'ID del nutriente en USDA FDC para mapeo automático';

-- ============================================================================
-- 2. Alimentos FDC (staging, antes de aprobar)
-- ============================================================================
CREATE TABLE fdc.foods (
  id BIGSERIAL PRIMARY KEY,
  fdc_id INT UNIQUE NOT NULL,            -- ID en USDA FDC
  description TEXT NOT NULL,             -- Nombre en inglés (original FDC)
  data_type TEXT NOT NULL,               -- 'Foundation', 'SR Legacy', 'Branded'
  food_category TEXT,                    -- Categoría FDC
  publication_date DATE,                 -- Fecha de publicación en FDC
  
  -- Calidad y trazabilidad
  quality_score INT DEFAULT 0,           -- 3=Foundation, 2=SR Legacy, 1=Branded
  is_approved BOOLEAN DEFAULT FALSE,     -- ¿Aprobado para migrar a Food?
  is_migrated BOOLEAN DEFAULT FALSE,     -- ¿Ya migrado a Food?
  migrated_food_id UUID,                 -- ID del Food creado (si migrado)
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para búsqueda
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', description || ' ' || COALESCE(food_category, ''))
  ) STORED
);

COMMENT ON TABLE fdc.foods IS 'Alimentos importados de USDA FDC. Staging antes de aprobar y migrar a Food.';
COMMENT ON COLUMN fdc.foods.quality_score IS 'Calidad: 3=Foundation (lab), 2=SR Legacy, 1=Branded, 0=otro';
COMMENT ON COLUMN fdc.foods.is_approved IS 'TRUE = revisado y aprobado para usar en la app';
COMMENT ON COLUMN fdc.foods.is_migrated IS 'TRUE = ya migrado a tabla Food principal';

-- Índices
CREATE INDEX idx_fdc_foods_quality ON fdc.foods(quality_score DESC, is_approved);
CREATE INDEX idx_fdc_foods_search ON fdc.foods USING GIN(search_vector);
CREATE INDEX idx_fdc_foods_data_type ON fdc.foods(data_type);

-- ============================================================================
-- 3. Valores nutricionales (normalizado, por 100g)
-- ============================================================================
CREATE TABLE fdc.food_nutrients (
  food_id BIGINT REFERENCES fdc.foods(id) ON DELETE CASCADE,
  nutrient_id BIGINT REFERENCES fdc.nutrients(id) ON DELETE CASCADE,
  
  amount NUMERIC NOT NULL,               -- Cantidad por 100g
  
  -- Metadatos de calidad (de FDC)
  derivation_code TEXT,                  -- Cómo se obtuvo: 'A'=Analytical (lab), 'AS'=calculado, etc.
  data_points INT,                       -- Número de muestras analizadas
  min_value NUMERIC,                     -- Valor mínimo en las muestras
  max_value NUMERIC,                     -- Valor máximo en las muestras
  
  PRIMARY KEY (food_id, nutrient_id)
);

COMMENT ON TABLE fdc.food_nutrients IS 'Valores nutricionales por 100g. Incluye trazabilidad (derivation_code, data_points).';
COMMENT ON COLUMN fdc.food_nutrients.derivation_code IS 'A=Analytical (medido), AS=Analytical Summed, C=Calculated, NC=Not Calculated';
COMMENT ON COLUMN fdc.food_nutrients.data_points IS 'Número de muestras de laboratorio analizadas (más alto = más confiable)';

-- Índice para búsqueda
CREATE INDEX idx_fdc_food_nutrients_food ON fdc.food_nutrients(food_id);
CREATE INDEX idx_fdc_food_nutrients_nutrient ON fdc.food_nutrients(nutrient_id);

-- ============================================================================
-- 4. Traducciones AR/ES (formato: "Argentina/España")
-- ============================================================================
CREATE TABLE fdc.food_translations (
  food_id BIGINT REFERENCES fdc.foods(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,                    -- 'es' (español)
  name TEXT NOT NULL,                    -- 'Porotos/Judías', 'Palta/Aguacate'
  search_terms TEXT[],                   -- ['porotos', 'judías', 'frijoles', 'alubias']
  is_verified BOOLEAN DEFAULT FALSE,     -- ¿Revisado manualmente?
  
  PRIMARY KEY (food_id, lang)
);

COMMENT ON TABLE fdc.food_translations IS 'Traducciones de alimentos. Formato: "Argentina/España".';
COMMENT ON COLUMN fdc.food_translations.name IS 'Nombre en formato "Argentina/España" (ej: Porotos/Judías)';
COMMENT ON COLUMN fdc.food_translations.search_terms IS 'Array de términos de búsqueda (incluye variantes regionales)';

-- Índice para búsqueda
CREATE INDEX idx_fdc_translations_search ON fdc.food_translations USING GIN(search_terms);

-- ============================================================================
-- 5. Porciones y medidas caseras
-- ============================================================================
CREATE TABLE fdc.portions (
  food_id BIGINT REFERENCES fdc.foods(id) ON DELETE CASCADE,
  measure TEXT NOT NULL,                 -- 'cup', 'tbsp', 'medium', 'slice'
  gram_weight NUMERIC NOT NULL,          -- Peso en gramos
  measure_es TEXT,                       -- 'taza', 'cucharada', 'mediana', 'rebanada'
  
  PRIMARY KEY (food_id, measure)
);

COMMENT ON TABLE fdc.portions IS 'Porciones y medidas caseras para conversión a gramos';

-- ============================================================================
-- 6. Log de importaciones (auditoría)
-- ============================================================================
CREATE TABLE fdc.import_log (
  id BIGSERIAL PRIMARY KEY,
  import_type TEXT NOT NULL,             -- 'foundation', 'sr_legacy', 'manual'
  foods_imported INT DEFAULT 0,
  foods_updated INT DEFAULT 0,
  foods_skipped INT DEFAULT 0,
  status TEXT DEFAULT 'in_progress',     -- 'in_progress', 'completed', 'failed'
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE fdc.import_log IS 'Registro de importaciones de FDC para auditoría';

-- ============================================================================
-- 7. Mapeo de duplicados (evitar re-importar)
-- ============================================================================
CREATE TABLE fdc.duplicate_map (
  fdc_food_id BIGINT REFERENCES fdc.foods(id) ON DELETE CASCADE,
  existing_food_id UUID,                 -- ID en tabla Food principal
  similarity_score NUMERIC,              -- 0-1, qué tan similar es
  mapped_by TEXT DEFAULT 'auto',         -- 'auto' o 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (fdc_food_id, existing_food_id)
);

COMMENT ON TABLE fdc.duplicate_map IS 'Mapeo de alimentos FDC a alimentos existentes (evita duplicados)';

-- ============================================================================
-- FUNCIONES ÚTILES
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fdc.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fdc_foods_updated_at
  BEFORE UPDATE ON fdc.foods
  FOR EACH ROW
  EXECUTE FUNCTION fdc.update_updated_at();

-- ============================================================================
-- DATOS INICIALES: Mapeo de nutrientes FDC → nuestros tags
-- ============================================================================

INSERT INTO fdc.nutrients (tag, fdc_nutrient_id, name_en, name_es, unit, category) VALUES
-- Macronutrientes
('protein', 1003, 'Protein', 'Proteína', 'g', 'macro'),
('carbohydrates', 1005, 'Carbohydrate, by difference', 'Carbohidratos', 'g', 'macro'),
('fat', 1004, 'Total lipid (fat)', 'Grasa total', 'g', 'macro'),
('calories', 1008, 'Energy', 'Energía', 'kcal', 'macro'),
('fiber', 1079, 'Fiber, total dietary', 'Fibra dietética', 'g', 'macro'),
('sugar', 2000, 'Sugars, total', 'Azúcares totales', 'g', 'macro'),

-- Vitaminas
('vitaminA', 1104, 'Vitamin A, RAE', 'Vitamina A', 'µg', 'vitamin'),
('vitaminC', 1162, 'Vitamin C, total ascorbic acid', 'Vitamina C', 'mg', 'vitamin'),
('vitaminD', 1114, 'Vitamin D (D2 + D3)', 'Vitamina D', 'µg', 'vitamin'),
('vitaminE', 1109, 'Vitamin E (alpha-tocopherol)', 'Vitamina E', 'mg', 'vitamin'),
('vitaminK', 1185, 'Vitamin K (phylloquinone)', 'Vitamina K', 'µg', 'vitamin'),
('vitaminB1', 1165, 'Thiamin', 'Tiamina (B1)', 'mg', 'vitamin'),
('vitaminB2', 1166, 'Riboflavin', 'Riboflavina (B2)', 'mg', 'vitamin'),
('vitaminB3', 1167, 'Niacin', 'Niacina (B3)', 'mg', 'vitamin'),
('vitaminB6', 1175, 'Vitamin B-6', 'Vitamina B6', 'mg', 'vitamin'),
('folate', 1177, 'Folate, DFE', 'Folato', 'µg', 'vitamin'),
('vitaminB12', 1178, 'Vitamin B-12', 'Vitamina B12', 'µg', 'vitamin'),
('vitaminB5', 1170, 'Pantothenic acid', 'Ácido pantoténico (B5)', 'mg', 'vitamin'),
('vitaminB7', 1176, 'Biotin', 'Biotina (B7)', 'µg', 'vitamin'),
('choline', 1180, 'Choline, total', 'Colina', 'mg', 'vitamin'),

-- Minerales
('calcium', 1087, 'Calcium, Ca', 'Calcio', 'mg', 'mineral'),
('iron', 1089, 'Iron, Fe', 'Hierro', 'mg', 'mineral'),
('magnesium', 1090, 'Magnesium, Mg', 'Magnesio', 'mg', 'mineral'),
('phosphorus', 1091, 'Phosphorus, P', 'Fósforo', 'mg', 'mineral'),
('potassium', 1092, 'Potassium, K', 'Potasio', 'mg', 'mineral'),
('zinc', 1095, 'Zinc, Zn', 'Zinc', 'mg', 'mineral'),
('copper', 1098, 'Copper, Cu', 'Cobre', 'mg', 'mineral'),
('manganese', 1101, 'Manganese, Mn', 'Manganeso', 'mg', 'mineral'),
('selenium', 1103, 'Selenium, Se', 'Selenio', 'µg', 'mineral'),
('iodine', 1100, 'Iodine, I', 'Yodo', 'µg', 'mineral'),
('chromium', 1096, 'Chromium, Cr', 'Cromo', 'µg', 'mineral'),
('molybdenum', 1102, 'Molybdenum, Mo', 'Molibdeno', 'µg', 'mineral'),
('chloride', 1088, 'Chloride, Cl', 'Cloruro', 'mg', 'mineral'),
('fluoride', 1099, 'Fluoride, F', 'Flúor', 'µg', 'mineral')

ON CONFLICT (tag) DO NOTHING;

-- ============================================================================
-- PERMISOS (ajustar según necesidad)
-- ============================================================================

-- Solo admin puede escribir, autenticados pueden leer
ALTER TABLE fdc.nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc.food_nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc.food_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc.portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc.duplicate_map ENABLE ROW LEVEL SECURITY;

-- Política: todos pueden leer (para búsqueda de alimentos)
CREATE POLICY "Allow read fdc.nutrients" ON fdc.nutrients FOR SELECT USING (true);
CREATE POLICY "Allow read fdc.foods" ON fdc.foods FOR SELECT USING (is_approved = true);
CREATE POLICY "Allow read fdc.food_nutrients" ON fdc.food_nutrients FOR SELECT USING (true);
CREATE POLICY "Allow read fdc.translations" ON fdc.food_translations FOR SELECT USING (true);
CREATE POLICY "Allow read fdc.portions" ON fdc.portions FOR SELECT USING (true);

-- Solo service_role puede escribir (para ETL)
-- Las políticas de INSERT/UPDATE/DELETE se manejarán vía service_role

-- ============================================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_fdc_foods_approved_migrated ON fdc.foods(is_approved, is_migrated);
CREATE INDEX idx_fdc_foods_category ON fdc.foods(food_category);

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Alimentos con todos sus nutrientes (para revisión)
CREATE VIEW fdc.foods_with_nutrients AS
SELECT 
  f.id,
  f.fdc_id,
  f.description,
  f.data_type,
  f.quality_score,
  f.is_approved,
  jsonb_object_agg(
    n.tag,
    jsonb_build_object(
      'amount', fn.amount,
      'unit', n.unit,
      'derivation', fn.derivation_code,
      'data_points', fn.data_points
    )
  ) FILTER (WHERE n.tag IS NOT NULL) as nutrients
FROM fdc.foods f
LEFT JOIN fdc.food_nutrients fn ON f.id = fn.food_id
LEFT JOIN fdc.nutrients n ON fn.nutrient_id = n.id
GROUP BY f.id, f.fdc_id, f.description, f.data_type, f.quality_score, f.is_approved;

COMMENT ON VIEW fdc.foods_with_nutrients IS 'Vista para revisar alimentos con todos sus nutrientes agregados';

-- Vista: Alimentos listos para migrar
CREATE VIEW fdc.foods_ready_to_migrate AS
SELECT 
  f.id,
  f.fdc_id,
  f.description,
  COALESCE(t.name, f.description) as display_name,
  f.quality_score,
  COUNT(fn.nutrient_id) as nutrient_count
FROM fdc.foods f
LEFT JOIN fdc.food_translations t ON f.id = t.food_id AND t.lang = 'es'
LEFT JOIN fdc.food_nutrients fn ON f.id = fn.food_id
WHERE f.is_approved = true 
  AND f.is_migrated = false
GROUP BY f.id, f.fdc_id, f.description, t.name, f.quality_score
HAVING COUNT(fn.nutrient_id) >= 10  -- Al menos 10 nutrientes
ORDER BY f.quality_score DESC;

COMMENT ON VIEW fdc.foods_ready_to_migrate IS 'Alimentos aprobados, no migrados, con suficientes nutrientes';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
