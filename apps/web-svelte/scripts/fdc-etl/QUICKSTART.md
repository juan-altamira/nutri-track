# ⚡ Guía Rápida: Importar 100 Alimentos en 15 Minutos

## 🎯 Objetivo

Importar alimentos de USDA FDC con traducciones AR/ES y máxima fiabilidad.

## ✅ Checklist Previo

- [ ] API Key de USDA FDC obtenida
- [ ] Variables en `.env` configuradas
- [ ] Migración de BD aplicada

## 🚀 Paso a Paso

### 1️⃣ Obtener API Key (2 min)

```bash
# Ir a: https://fdc.nal.usda.gov/api-key-signup.html
# Completar formulario
# Copiar API Key del email
```

Agregar al `.env`:
```bash
FDC_API_KEY=tu_api_key_de_fdc
```

### 2️⃣ Aplicar Migración (1 min)

```bash
cd /home/usuario/CascadeProjects/Nutri-Track/supabase

# Aplicar migración al proyecto remoto
npx supabase db push
```

Verifica que se creó el schema `fdc` con 7 tablas.

### 3️⃣ Descargar Alimentos (8 min)

```bash
cd /home/usuario/CascadeProjects/Nutri-Track/apps/web-svelte

# Instalar dependencias si es necesario
npm install

# Descargar top alimentos comunes
node scripts/fdc-etl/download-fdc-data.js
```

**Resultado esperado:**
```
✅ Importados: ~100 alimentos
⏭️  Omitidos: ~20 (duplicados)
```

### 4️⃣ Agregar Traducciones (2 min)

```bash
node scripts/fdc-etl/add-translations.js
```

**Resultado esperado:**
```
✅ Traducciones agregadas: ~80
```

### 5️⃣ Aprobar Alimentos (1 min)

```sql
-- En Supabase SQL Editor:
UPDATE fdc.foods
SET is_approved = true
WHERE quality_score >= 2  -- Foundation o SR Legacy
  AND id IN (
    SELECT food_id FROM fdc.food_translations WHERE lang = 'es'
  );
```

### 6️⃣ Migrar a Food (1 min)

```bash
# Primero ver qué se va a migrar (dry-run)
node scripts/fdc-etl/migrate-to-food.js --dry-run

# Si todo OK, migrar realmente
node scripts/fdc-etl/migrate-to-food.js
```

**Resultado esperado:**
```
✅ Migrados: ~80 alimentos
```

## 🎉 ¡Listo!

Ahora tenés ~80 alimentos en la tabla `Food` con:
- ✅ Nombres en formato "Argentina/España"
- ✅ 30+ micronutrientes completos
- ✅ Trazabilidad (source = 'FDC')
- ✅ Máxima fiabilidad (laboratorio USDA)

## 🔍 Verificar

```sql
-- Ver alimentos migrados
SELECT 
  name, 
  protein, 
  carbohydrates, 
  calories,
  "vitaminA",
  calcium
FROM "Food"
WHERE source = 'FDC'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Contar total
SELECT COUNT(*) FROM "Food" WHERE source = 'FDC';
```

## 📋 Próximos Pasos

### Importar Más Alimentos

```bash
# Términos específicos
node scripts/fdc-etl/download-fdc-data.js "salmon,tuna,cod,shrimp"

# Agregar traducciones (editar antes el archivo)
node scripts/fdc-etl/add-translations.js

# Aprobar y migrar
node scripts/fdc-etl/migrate-to-food.js
```

### Personalizar Traducciones

Editá `scripts/fdc-etl/add-translations.js`:

```javascript
const TRANSLATIONS = {
  'salmon': { 
    name: 'Salmón/Salmón', 
    terms: ['salmón', 'salmon'] 
  },
  // Agregar más...
};
```

## 🆘 Problemas Comunes

### "API rate limit exceeded"

**Solución**: Esperá 1 hora o aumentá el delay en el script.

### "No hay alimentos para migrar"

**Solución**: Verificá que los alimentos estén aprobados:
```sql
SELECT is_approved, COUNT(*) 
FROM fdc.foods 
GROUP BY is_approved;
```

### Alimentos sin traducción

**Solución**: Agregar manualmente:
```sql
INSERT INTO fdc.food_translations (food_id, lang, name, search_terms)
VALUES (123, 'es', 'Nombre AR/Nombre ES', ARRAY['termino1', 'termino2']);
```

## 📞 Soporte

- Ver README completo: `scripts/fdc-etl/README.md`
- Documentación USDA FDC: https://fdc.nal.usda.gov/api-guide.html

---

**⏱️ Tiempo total: ~15 minutos**
**📦 Resultado: ~80 alimentos de máxima calidad**
