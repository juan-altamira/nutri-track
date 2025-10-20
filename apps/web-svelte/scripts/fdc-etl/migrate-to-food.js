/**
 * Script para migrar alimentos aprobados de fdc.foods → Food
 * 
 * IMPORTANTE: Este script migra datos a la tabla Food principal.
 * Solo migra alimentos que:
 *   - is_approved = true
 *   - is_migrated = false
 *   - Tienen al menos 10 nutrientes
 *   - Tienen traducción en español
 * 
 * Uso:
 *   node migrate-to-food.js [--dry-run] [--limit N]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = args.find(a => a.startsWith('--limit'))?.split('=')[1] || 1000;

// Mapeo de nutrientes FDC tag → columna en Food
const NUTRIENT_COLUMN_MAP = {
  'protein': 'protein',
  'carbohydrates': 'carbohydrates',
  'fat': 'fat',
  'calories': 'calories',
  'vitaminA': 'vitaminA',
  'vitaminC': 'vitaminC',
  'vitaminD': 'vitaminD',
  'vitaminE': 'vitaminE',
  'vitaminK': 'vitaminK',
  'vitaminB1': 'vitaminB1',
  'vitaminB2': 'vitaminB2',
  'vitaminB3': 'vitaminB3',
  'vitaminB6': 'vitaminB6',
  'folate': 'folate',
  'vitaminB12': 'vitaminB12',
  'vitaminB5': 'vitaminB5',
  'vitaminB7': 'vitaminB7',
  'choline': 'choline',
  'calcium': 'calcium',
  'chloride': 'chloride',
  'chromium': 'chromium',
  'copper': 'copper',
  'fluoride': 'fluoride',
  'iodine': 'iodine',
  'iron': 'iron',
  'magnesium': 'magnesium',
  'manganese': 'manganese',
  'molybdenum': 'molybdenum',
  'phosphorus': 'phosphorus',
  'potassium': 'potassium',
  'selenium': 'selenium',
  'zinc': 'zinc'
};

// ============================================================================
// FUNCIONES
// ============================================================================

/**
 * Obtener alimentos listos para migrar
 */
async function getFoodsReadyToMigrate(limit) {
  const { data, error } = await supabase
    .rpc('get_foods_ready_to_migrate_with_details', { p_limit: limit });
  
  if (error) {
    // Si la función no existe, usar query manual
    const { data: foods, error: err2 } = await supabase
      .from('fdc.foods')
      .select(`
        id,
        fdc_id,
        description,
        data_type,
        quality_score,
        food_translations!inner(name, search_terms),
        food_nutrients(
          nutrient_id,
          amount,
          nutrients(tag, unit)
        )
      `)
      .eq('is_approved', true)
      .eq('is_migrated', false)
      .eq('food_translations.lang', 'es')
      .limit(limit);
    
    if (err2) {
      console.error('❌ Error obteniendo alimentos:', err2);
      return [];
    }
    
    // Filtrar solo los que tienen suficientes nutrientes
    return foods.filter(f => f.food_nutrients?.length >= 10);
  }
  
  return data || [];
}

/**
 * Verificar si un alimento ya existe en Food (por nombre)
 */
async function checkDuplicate(name) {
  const { data, error } = await supabase
    .from('Food')
    .select('id, name')
    .eq('name', name)
    .maybeSingle();
  
  if (error) {
    console.error('❌ Error verificando duplicado:', error);
    return null;
  }
  
  return data;
}

/**
 * Construir objeto Food a partir de alimento FDC
 */
function buildFoodObject(fdcFood) {
  const translation = fdcFood.food_translations[0];
  const nutrients = {};
  
  // Inicializar todos los nutrientes en 0
  Object.keys(NUTRIENT_COLUMN_MAP).forEach(tag => {
    nutrients[NUTRIENT_COLUMN_MAP[tag]] = 0;
  });
  
  // Llenar con valores reales
  fdcFood.food_nutrients.forEach(fn => {
    const tag = fn.nutrients.tag;
    const column = NUTRIENT_COLUMN_MAP[tag];
    
    if (column) {
      let amount = parseFloat(fn.amount);
      
      // Convertir a las unidades correctas según la columna
      // (FDC ya viene normalizado por 100g, pero verificamos unidades)
      const unit = fn.nutrients.unit;
      
      // Vitaminas y minerales: convertir todo a mg o µg según corresponda
      if (unit === 'g') {
        // Macros ya están en g
        nutrients[column] = amount;
      } else if (unit === 'mg') {
        nutrients[column] = amount;
      } else if (unit === 'µg' || unit === 'mcg') {
        nutrients[column] = amount; // Ya en µg
      } else if (unit === 'kcal') {
        nutrients[column] = amount;
      } else {
        // Default: usar el valor tal cual
        nutrients[column] = amount;
      }
    }
  });
  
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : generateUUID(),
    name: translation.name,
    source: 'FDC',
    creatorId: null, // Alimento global
    ...nutrients,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Generar UUID (fallback si crypto.randomUUID no existe)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Insertar alimento en Food
 */
async function insertFood(foodData) {
  const { data, error } = await supabase
    .from('Food')
    .insert(foodData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error insertando Food:', error);
    return null;
  }
  
  return data;
}

/**
 * Marcar alimento FDC como migrado
 */
async function markAsMigrated(fdcFoodId, foodId) {
  const { error } = await supabase
    .from('fdc.foods')
    .update({
      is_migrated: true,
      migrated_food_id: foodId
    })
    .eq('id', fdcFoodId);
  
  if (error) {
    console.error('❌ Error marcando como migrado:', error);
  }
}

/**
 * Procesar un alimento
 */
async function processFood(fdcFood) {
  const translation = fdcFood.food_translations[0];
  const name = translation.name;
  
  console.log(`\n📦 Procesando: ${name}`);
  console.log(`   FDC ID: ${fdcFood.fdc_id}`);
  console.log(`   Tipo: ${fdcFood.data_type} (calidad ${fdcFood.quality_score}/3)`);
  console.log(`   Nutrientes: ${fdcFood.food_nutrients.length}`);
  
  // Verificar duplicado
  const existing = await checkDuplicate(name);
  if (existing) {
    console.log(`   ⚠️  Ya existe en Food (ID: ${existing.id})`);
    
    if (!DRY_RUN) {
      // Marcar como migrado apuntando al existente
      await markAsMigrated(fdcFood.id, existing.id);
    }
    
    return { skipped: true, reason: 'duplicate' };
  }
  
  // Construir objeto Food
  const foodData = buildFoodObject(fdcFood);
  
  console.log(`   📊 Nutrientes principales:`);
  console.log(`      Proteína: ${foodData.protein}g`);
  console.log(`      Carbohidratos: ${foodData.carbohydrates}g`);
  console.log(`      Grasa: ${foodData.fat}g`);
  console.log(`      Calorías: ${foodData.calories}kcal`);
  
  if (DRY_RUN) {
    console.log(`   🔍 [DRY RUN] No se insertará`);
    return { dryRun: true };
  }
  
  // Insertar
  const inserted = await insertFood(foodData);
  if (!inserted) {
    return { error: true };
  }
  
  // Marcar como migrado
  await markAsMigrated(fdcFood.id, inserted.id);
  
  console.log(`   ✅ Migrado exitosamente (Food ID: ${inserted.id})`);
  
  return { migrated: true, food: inserted };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 MIGRAR ALIMENTOS FDC → FOOD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (DRY_RUN) {
    console.log('⚠️  MODO DRY RUN: No se realizarán cambios\n');
  }
  
  console.log(`📋 Límite: ${LIMIT} alimentos\n`);
  
  // Obtener alimentos
  console.log('🔍 Buscando alimentos listos para migrar...');
  const foods = await getFoodsReadyToMigrate(parseInt(LIMIT));
  
  if (foods.length === 0) {
    console.log('\n⚠️  No hay alimentos listos para migrar');
    console.log('\nRequisitos:');
    console.log('  - is_approved = true');
    console.log('  - is_migrated = false');
    console.log('  - Al menos 10 nutrientes');
    console.log('  - Traducción en español');
    process.exit(0);
  }
  
  console.log(`✅ Encontrados: ${foods.length} alimentos\n`);
  
  const stats = {
    migrated: 0,
    skipped: 0,
    errors: 0
  };
  
  // Procesar cada alimento
  for (let i = 0; i < foods.length; i++) {
    console.log(`\n[${i + 1}/${foods.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const result = await processFood(foods[i]);
    
    if (result.migrated) {
      stats.migrated++;
    } else if (result.skipped) {
      stats.skipped++;
    } else if (result.error) {
      stats.errors++;
    }
    
    // Delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Resumen
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Migrados:  ${stats.migrated}`);
  console.log(`⏭️  Omitidos:  ${stats.skipped}`);
  console.log(`❌ Errores:   ${stats.errors}`);
  console.log(`📦 Total:     ${foods.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (DRY_RUN) {
    console.log('💡 Para migrar realmente, ejecutá sin --dry-run\n');
  } else {
    console.log('✅ Migración completada\n');
  }
}

main().catch(console.error);
