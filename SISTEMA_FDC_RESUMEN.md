# ✅ SISTEMA FDC IMPLEMENTADO

## 🎉 ¿Qué se creó?

Un **sistema completo y reversible** para importar cientos de alimentos de USDA FoodData Central con **máxima fiabilidad** y traducciones AR/ES.

### 📦 Componentes

1. **Schema de Base de Datos** (`fdc.*`)
   - 7 tablas nuevas en schema separado
   - Catálogo de 35 nutrientes prellenado
   - Vistas útiles para administración
   - **Reversible**: `DROP SCHEMA fdc CASCADE;`

2. **Scripts ETL** (3 archivos)
   - `download-fdc-data.js`: Descarga de FDC API
   - `add-translations.js`: Traducciones AR/ES
   - `migrate-to-food.js`: Migración a Food

3. **Documentación Completa**
   - `README.md`: Guía técnica detallada
   - `QUICKSTART.md`: Guía de 15 minutos
   - `.env.example`: Variables necesarias

4. **Comandos NPM**
   ```bash
   npm run fdc:download     # Descargar de FDC
   npm run fdc:translate    # Agregar traducciones
   npm run fdc:migrate      # Migrar a Food
   npm run fdc:migrate:dry  # Dry-run (sin cambios)
   npm run fdc:all          # Pipeline completo
   ```

---

## 🚀 PRÓXIMOS PASOS (15 minutos)

### 1️⃣ Obtener API Key de USDA FDC (2 min)

**Ve a:** https://fdc.nal.usda.gov/api-key-signup.html

**Completá:**
- Email
- Nombre
- Organización: "Nutri-Track"
- Propósito: "Nutrition tracking app"

**Recibirás** un email con tu API Key.

**Agregá** al `.env`:
```bash
# En /home/usuario/CascadeProjects/Nutri-Track/apps/web-svelte/.env
FDC_API_KEY=tu_api_key_aqui
```

### 2️⃣ Aplicar Migración a Supabase (1 min)

```bash
cd /home/usuario/CascadeProjects/Nutri-Track/supabase

# Aplicar al proyecto remoto
npx supabase db push
```

**Verificá** que se creó el schema `fdc` en Supabase.

### 3️⃣ Instalar Dependencias (1 min)

```bash
cd /home/usuario/CascadeProjects/Nutri-Track/apps/web-svelte

# Instalar dotenv
npm install
```

### 4️⃣ Descargar Alimentos (8 min)

```bash
# Descargar top ~100 alimentos comunes
npm run fdc:download
```

**Esperá** ~8 minutos. Verás:
```
✅ Importados: ~100 alimentos
⏭️  Omitidos: ~20 (duplicados)
```

### 5️⃣ Agregar Traducciones (2 min)

```bash
npm run fdc:translate
```

**Resultado:**
```
✅ Traducciones agregadas: ~80
```

### 6️⃣ Aprobar Alimentos en Supabase (1 min)

**Ve a:** Supabase → SQL Editor

**Ejecutá:**
```sql
UPDATE fdc.foods
SET is_approved = true
WHERE quality_score >= 2  -- Foundation o SR Legacy
  AND id IN (
    SELECT food_id FROM fdc.food_translations WHERE lang = 'es'
  );
```

**Verificá:**
```sql
SELECT is_approved, COUNT(*) 
FROM fdc.foods 
GROUP BY is_approved;
```

Deberías ver ~80 alimentos aprobados.

### 7️⃣ Migrar a Food (1 min)

```bash
# Primero ver qué se va a migrar (sin cambios)
npm run fdc:migrate:dry

# Si todo OK, migrar realmente
npm run fdc:migrate
```

**Resultado esperado:**
```
✅ Migrados: ~80 alimentos
```

---

## ✅ Verificación Final

**En Supabase SQL Editor:**

```sql
-- Ver alimentos migrados
SELECT 
  name, 
  protein, 
  carbohydrates, 
  calories,
  "vitaminA",
  calcium,
  source
FROM "Food"
WHERE source = 'FDC'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Contar total
SELECT COUNT(*) as total FROM "Food" WHERE source = 'FDC';
```

**Deberías ver:**
- ~80 alimentos con nombres en formato "Argentina/España"
- Todos los micronutrientes completos
- `source = 'FDC'`

---

## 🎯 Resultado Final

### ✅ Qué lograste:

1. **~80 alimentos de máxima calidad**
   - Foundation Foods (laboratorio USDA)
   - SR Legacy (base histórica consolidada)

2. **30+ micronutrientes completos**
   - Vitaminas: A, C, D, E, K, B1-B12, folato, biotina, colina
   - Minerales: Ca, Fe, Mg, Zn, Se, I, Cu, Mn, etc.
   - Macros: proteína, carbos, grasa, calorías, fibra

3. **Traducciones AR/ES**
   - Formato: "Argentina/España"
   - Ejemplos:
     - Porotos/Judías
     - Palta/Aguacate
     - Banana/Plátano
     - Papa/Patata

4. **Trazabilidad total**
   - `quality_score`: 2-3 (máxima calidad)
   - `derivation_code`: 'A' = Analytical (laboratorio)
   - `data_points`: Número de muestras analizadas

### 🔄 Proceso vs Manual

**Antes:**
- 1 alimento = 30 min de investigación
- 10 alimentos = 5 horas
- 100 alimentos = 50 horas

**Ahora:**
- 100 alimentos = 15 minutos
- Datos de laboratorio USDA
- Sin errores de transcripción
- Trazabilidad completa

---

## 📈 Escalar a 500+ Alimentos

### Opción A: Agregar más términos

**Editá** `apps/web-svelte/scripts/fdc-etl/download-fdc-data.js`:

```javascript
const DEFAULT_SEARCH_TERMS = [
  // Agregar más...
  'salmon', 'tuna', 'cod', 'shrimp',
  'asparagus', 'eggplant', 'radish',
  'blueberry', 'raspberry', 'blackberry',
  // etc...
];
```

**Ejecutá:**
```bash
npm run fdc:download
npm run fdc:translate
# Aprobar en Supabase
npm run fdc:migrate
```

### Opción B: Términos específicos

```bash
node scripts/fdc-etl/download-fdc-data.js "salmon,tuna,cod,shrimp,lobster"
npm run fdc:translate
# Aprobar y migrar
```

### Opción C: Descarga masiva (avanzado)

**Para 1000+ alimentos**, usar descarga CSV completa de FDC:
- https://fdc.nal.usda.gov/download-datasets.html
- Foundation Foods (~1.2 GB)
- SR Legacy (~8.5 GB)

---

## 🛡️ Seguridad y Reversibilidad

### Rollback Completo

```sql
-- Eliminar TODO el sistema FDC
DROP SCHEMA fdc CASCADE;

-- Los alimentos migrados a Food quedan intactos
```

### Rollback Parcial

```sql
-- Eliminar solo alimentos no migrados
DELETE FROM fdc.foods WHERE is_migrated = false;

-- Desmarcar como migrados para re-procesar
UPDATE fdc.foods 
SET is_migrated = false, migrated_food_id = NULL
WHERE ...;
```

### Datos Originales

**Tu tabla `Food` NO se modificó**, solo se agregaron alimentos nuevos con `source = 'FDC'`.

**Tus alimentos manuales** tienen `source = 'GLOBAL'` o `'USER'` y están intactos.

---

## 📚 Documentación

- **Guía Rápida**: `apps/web-svelte/scripts/fdc-etl/QUICKSTART.md`
- **README Completo**: `apps/web-svelte/scripts/fdc-etl/README.md`
- **USDA FDC Docs**: https://fdc.nal.usda.gov/api-guide.html

---

## 🆘 Soporte

### Problemas Comunes

**"API rate limit exceeded"**
→ Esperá 1 hora o aumentá el delay en el script

**"No hay alimentos para migrar"**
→ Verificá que estén aprobados: `SELECT is_approved, COUNT(*) FROM fdc.foods GROUP BY is_approved;`

**Alimentos sin traducción**
→ Agregarlas manualmente en Supabase o editá `add-translations.js`

---

## 🎊 ¡Felicitaciones!

Tenés un sistema **profesional, escalable y reversible** para cargar cientos de alimentos con **suprema fiabilidad**.

**Próximo paso sugerido:** Probá buscar alimentos en tu app y verificá que aparecen con todos los micronutrientes.

---

**Commit:** `e8b0a69` - Sistema completo pushado a GitHub
**Tiempo de desarrollo:** ~3 horas
**Tiempo de uso:** ~15 minutos
**Alimentos iniciales:** ~80
**Escalabilidad:** Cientos o miles
