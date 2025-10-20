# Sistema de Importación USDA FoodData Central

Sistema completo y reversible para importar alimentos de USDA FDC con máxima calidad y trazabilidad.

## 🎯 Características

- ✅ **Suprema fiabilidad**: Foundation Foods (laboratorio) y SR Legacy
- ✅ **Micronutrientes completos**: 30+ nutrientes por alimento
- ✅ **Traducciones AR/ES**: Formato "Argentina/España"
- ✅ **Trazabilidad total**: `derivation_code`, `data_points`, `quality_score`
- ✅ **Reversible**: Schema separado (`fdc.*`), fácil rollback
- ✅ **Sin duplicados**: Verificación automática
- ✅ **Auditable**: Logs de importación

## 📋 Requisitos Previos

### 1. API Key de USDA FDC

1. Registrate en: https://fdc.nal.usda.gov/api-key-signup.html
2. Recibirás un email con tu API key
3. Agregala al `.env`:

```bash
FDC_API_KEY=tu_api_key_aqui
```

### 2. Variables de Entorno

```bash
# .env
FDC_API_KEY=your_fdc_api_key
PUBLIC_SUPABASE_URL=https://pjtizyzmhywcujerhipa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚀 Flujo de Uso

### Paso 1: Aplicar Migración a Supabase

```bash
# Desde el root del proyecto
cd supabase

# Aplicar al proyecto remoto
npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.pjtizyzmhywcujerhipa.supabase.co:5432/postgres"
```

Esto creará:
- Schema `fdc` con todas las tablas
- Catálogo de nutrientes prellenado
- Vistas útiles para revisión

### Paso 2: Descargar Datos de FDC

```bash
cd apps/web-svelte

# Descargar alimentos predefinidos (top comunes)
node scripts/fdc-etl/download-fdc-data.js

# O descargar términos específicos
node scripts/fdc-etl/download-fdc-data.js apple,banana,chicken
```

Esto guardará en `fdc.foods` y `fdc.food_nutrients`.

**Tiempo estimado**: 5-10 minutos para ~100 alimentos

### Paso 3: Agregar Traducciones

```bash
# Agregar traducciones AR/ES predefinidas
node scripts/fdc-etl/add-translations.js
```

Esto agregará traducciones en formato "Argentina/España":
- Porotos/Judías
- Palta/Aguacate
- Papa/Patata
- Ananá/Piña

**Tiempo estimado**: 2-3 minutos

### Paso 4: Revisar y Aprobar (Manual)

Conectate a Supabase y revisá:

```sql
-- Ver alimentos importados con nutrientes
SELECT * FROM fdc.foods_with_nutrients
ORDER BY quality_score DESC
LIMIT 20;

-- Ver alimentos con traducciones
SELECT 
  f.id,
  f.description,
  t.name as traduccion,
  f.quality_score,
  COUNT(fn.nutrient_id) as nutrientes
FROM fdc.foods f
LEFT JOIN fdc.food_translations t ON f.id = t.food_id AND t.lang = 'es'
LEFT JOIN fdc.food_nutrients fn ON f.id = fn.food_id
GROUP BY f.id, f.description, t.name, f.quality_score
ORDER BY f.quality_score DESC;

-- Aprobar alimentos (cambiar is_approved a true)
UPDATE fdc.foods
SET is_approved = true
WHERE quality_score >= 2  -- Foundation o SR Legacy
  AND id IN (
    SELECT DISTINCT food_id 
    FROM fdc.food_translations 
    WHERE lang = 'es'
  );
```

### Paso 5: Migrar a Food (Tabla Principal)

```bash
# Modo dry-run (ver qué se migrará sin hacer cambios)
node scripts/fdc-etl/migrate-to-food.js --dry-run

# Migrar realmente (máximo 100 por vez)
node scripts/fdc-etl/migrate-to-food.js --limit=100

# Migrar todos los aprobados
node scripts/fdc-etl/migrate-to-food.js
```

Esto creará alimentos en la tabla `Food` con:
- Nombre en formato "Argentina/España"
- Todos los micronutrientes normalizados
- `source = 'FDC'`
- Trazabilidad al alimento FDC original

## 📊 Estructura de Datos

### fdc.foods (Staging)

Alimentos importados antes de aprobar:

```sql
id              BIGINT      -- ID interno
fdc_id          INT         -- ID en USDA FDC
description     TEXT        -- Nombre original (inglés)
data_type       TEXT        -- 'Foundation', 'SR Legacy'
quality_score   INT         -- 3=Foundation, 2=SR, 1=Branded
is_approved     BOOLEAN     -- ¿Revisado y aprobado?
is_migrated     BOOLEAN     -- ¿Ya migrado a Food?
```

### fdc.food_nutrients

Valores nutricionales por 100g:

```sql
food_id         BIGINT      -- FK a fdc.foods
nutrient_id     BIGINT      -- FK a fdc.nutrients
amount          NUMERIC     -- Cantidad por 100g
derivation_code TEXT        -- 'A'=Analytical (lab), 'C'=Calculated
data_points     INT         -- Número de muestras de lab
```

### fdc.food_translations

Traducciones AR/ES:

```sql
food_id         BIGINT      -- FK a fdc.foods
lang            TEXT        -- 'es'
name            TEXT        -- 'Porotos/Judías'
search_terms    TEXT[]      -- ['porotos', 'judías', 'frijoles']
```

## 🔍 Queries Útiles

### Ver alimentos listos para migrar

```sql
SELECT * FROM fdc.foods_ready_to_migrate;
```

### Ver estadísticas de importación

```sql
SELECT 
  data_type,
  is_approved,
  is_migrated,
  COUNT(*) as total
FROM fdc.foods
GROUP BY data_type, is_approved, is_migrated
ORDER BY data_type, is_approved DESC, is_migrated;
```

### Ver logs de importación

```sql
SELECT * FROM fdc.import_log
ORDER BY started_at DESC;
```

### Buscar alimento por nombre

```sql
SELECT 
  f.description,
  t.name as traduccion,
  f.quality_score,
  jsonb_pretty(
    (SELECT jsonb_object_agg(n.tag, fn.amount)
     FROM fdc.food_nutrients fn
     JOIN fdc.nutrients n ON fn.nutrient_id = n.id
     WHERE fn.food_id = f.id)
  ) as nutrientes
FROM fdc.foods f
LEFT JOIN fdc.food_translations t ON f.id = t.food_id
WHERE f.description ILIKE '%apple%'
ORDER BY f.quality_score DESC;
```

## 🛡️ Calidad y Trazabilidad

### Quality Score

- **3 = Foundation**: Medido en laboratorio USDA
- **2 = SR Legacy**: Base histórica consolidada
- **1 = Branded**: Productos comerciales
- **0 = Otro**: Survey, calculado

### Derivation Code

- **A = Analytical**: Medido en laboratorio (máxima confianza)
- **AS = Analytical Summed**: Suma de componentes medidos
- **C = Calculated**: Calculado a partir de recetas
- **NC = Not Calculated**: Estimado

### Data Points

Número de muestras analizadas en laboratorio. Más alto = más confiable.

## 🔄 Rollback y Reversión

### Eliminar todo el sistema FDC

```sql
-- ⚠️ CUIDADO: Esto elimina TODOS los datos de FDC
DROP SCHEMA fdc CASCADE;
```

### Eliminar solo alimentos no migrados

```sql
DELETE FROM fdc.foods
WHERE is_migrated = false;
```

### Desmarcar alimentos como migrados (para re-migrar)

```sql
UPDATE fdc.foods
SET is_migrated = false,
    migrated_food_id = NULL
WHERE id IN (SELECT id FROM fdc.foods WHERE ...);
```

## 📈 Performance

### Importación Inicial

- **100 alimentos**: ~10 minutos
- **500 alimentos**: ~45 minutos
- **1000 alimentos**: ~90 minutos

Incluye:
- Descarga de FDC (con delay anti-rate-limit)
- Guardado en DB
- Traducciones

### Migración a Food

- **100 alimentos**: ~30 segundos
- **500 alimentos**: ~2 minutos
- **1000 alimentos**: ~4 minutos

## 🎨 Personalización

### Agregar más traducciones

Editá `scripts/fdc-etl/add-translations.js`:

```javascript
const TRANSLATIONS = {
  'apple': { 
    name: 'Manzana/Manzana', 
    terms: ['manzana', 'apple'] 
  },
  // Agregar más...
};
```

### Cambiar términos de búsqueda

Editá `scripts/fdc-etl/download-fdc-data.js`:

```javascript
const DEFAULT_SEARCH_TERMS = [
  'apple', 'banana', 
  // Agregar más...
];
```

### Filtrar por categoría

```javascript
// En download-fdc-data.js, función searchFDC:
url.searchParams.append('foodCategory', 'Fruits and Fruit Juices');
```

## 🐛 Troubleshooting

### Error: "API rate limit exceeded"

**Solución**: Aumentar el delay en `download-fdc-data.js`:

```javascript
await new Promise(resolve => setTimeout(resolve, 1000)); // 500 → 1000ms
```

### Error: "No hay alimentos listos para migrar"

**Causa**: Falta aprobar alimentos o agregar traducciones.

**Solución**:
```sql
-- Aprobar todos con calidad >= 2
UPDATE fdc.foods
SET is_approved = true
WHERE quality_score >= 2;
```

### Alimentos duplicados

El sistema verifica automáticamente por nombre. Si necesitás re-verificar:

```sql
-- Ver posibles duplicados
SELECT 
  f.name,
  COUNT(*) as total
FROM "Food" f
WHERE f.source = 'FDC'
GROUP BY f.name
HAVING COUNT(*) > 1;
```

## 📚 Recursos

- **USDA FDC**: https://fdc.nal.usda.gov/
- **API Docs**: https://fdc.nal.usda.gov/api-guide.html
- **Data Dictionary**: https://fdc.nal.usda.gov/data-documentation.html

## 🤝 Contribuir

Para agregar más alimentos:

1. Agregá términos a `DEFAULT_SEARCH_TERMS`
2. Agregá traducciones a `TRANSLATIONS`
3. Ejecutá los scripts
4. Revisá y aprobá manualmente
5. Migrá a Food

---

**Desarrollado para Nutri-Track**
**Datos: USDA FoodData Central (dominio público)**
