/**
 * Script para descargar datos de USDA FoodData Central
 * 
 * Uso:
 *   node download-fdc-data.js [food1,food2,food3]
 *   node download-fdc-data.js --full  (descarga completa Foundation + SR Legacy)
 * 
 * Requiere:
 *   - FDC_API_KEY en .env
 *   - SUPABASE_SERVICE_ROLE_KEY en .env
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const FDC_API_KEY = process.env.FDC_API_KEY;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FDC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   - FDC_API_KEY (obtener en https://fdc.nal.usda.gov/api-key-signup.html)');
  console.error('   - PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const FDC_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Data types en orden de calidad (Foundation > SR Legacy > Survey)
const DATA_TYPES = ['Foundation', 'SR Legacy'];

// Términos de búsqueda predefinidos (top alimentos)
const DEFAULT_SEARCH_TERMS = [
  // Frutas
  'apple', 'banana', 'orange', 'strawberry', 'grape', 'watermelon', 'pineapple',
  'mango', 'pear', 'peach', 'cherry', 'kiwi', 'avocado',
  
  // Verduras
  'tomato', 'lettuce', 'spinach', 'broccoli', 'carrot', 'onion', 'potato',
  'sweet potato', 'bell pepper', 'cucumber', 'zucchini', 'cabbage', 'cauliflower',
  
  // Proteínas
  'chicken breast', 'chicken thigh', 'beef', 'pork', 'salmon', 'tuna', 'egg',
  'turkey', 'shrimp', 'cod', 'tilapia',
  
  // Legumbres
  'black beans', 'kidney beans', 'chickpeas', 'lentils', 'pinto beans',
  
  // Granos
  'rice', 'oats', 'quinoa', 'pasta', 'bread', 'corn',
  
  // Lácteos
  'milk', 'yogurt', 'cheese', 'butter', 'cream',
  
  // Frutos secos
  'almonds', 'walnuts', 'peanuts', 'cashews', 'pistachios',
  
  // Aceites
  'olive oil', 'canola oil', 'sunflower oil'
];

// ============================================================================
// FUNCIONES DE API FDC
// ============================================================================

/**
 * Buscar alimentos en FDC
 */
async function searchFDC(query, pageSize = 50) {
  const url = new URL(`${FDC_BASE_URL}/foods/search`);
  url.searchParams.append('api_key', FDC_API_KEY);
  url.searchParams.append('query', query);
  url.searchParams.append('pageSize', pageSize);
  url.searchParams.append('dataType', DATA_TYPES.join(','));
  
  console.log(`   🔍 Buscando: "${query}"...`);
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`   ❌ Error HTTP ${response.status}`);
      return { foods: [] };
    }
    
    const data = await response.json();
    console.log(`   ✅ Encontrados: ${data.foods?.length || 0} resultados`);
    
    return data;
  } catch (error) {
    console.error(`   ❌ Error de red:`, error.message);
    return { foods: [] };
  }
}

/**
 * Obtener detalles completos de un alimento
 */
async function getFoodDetails(fdcId) {
  const url = `${FDC_BASE_URL}/food/${fdcId}?api_key=${FDC_API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`   ❌ Error obteniendo detalles de ${fdcId}:`, error.message);
    return null;
  }
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS
// ============================================================================

/**
 * Obtener mapeo de nutrientes FDC ID -> tag interno
 */
async function getNutrientMap() {
  const { data, error } = await supabase
    .from('fdc.nutrients')
    .select('id, tag, fdc_nutrient_id');
  
  if (error) {
    console.error('❌ Error obteniendo nutrientes:', error);
    return {};
  }
  
  const map = {};
  data.forEach(n => {
    if (n.fdc_nutrient_id) {
      map[n.fdc_nutrient_id] = { id: n.id, tag: n.tag };
    }
  });
  
  return map;
}

/**
 * Calcular quality_score según data_type
 */
function calculateQualityScore(dataType) {
  switch (dataType) {
    case 'Foundation':
      return 3;
    case 'SR Legacy':
      return 2;
    case 'Survey (FNDDS)':
      return 1;
    default:
      return 0;
  }
}

/**
 * Verificar si un alimento ya existe en FDC
 */
async function foodExists(fdcId) {
  const { data } = await supabase
    .from('fdc.foods')
    .select('id')
    .eq('fdc_id', fdcId)
    .single();
  
  return data !== null;
}

/**
 * Insertar alimento en fdc.foods
 */
async function insertFood(foodData) {
  const { data, error } = await supabase
    .from('fdc.foods')
    .insert({
      fdc_id: foodData.fdcId,
      description: foodData.description,
      data_type: foodData.dataType,
      food_category: foodData.foodCategory || null,
      publication_date: foodData.publicationDate || null,
      quality_score: calculateQualityScore(foodData.dataType),
      is_approved: false,
      is_migrated: false
    })
    .select()
    .single();
  
  if (error) {
    console.error(`   ❌ Error insertando alimento:`, error);
    return null;
  }
  
  return data;
}

/**
 * Insertar nutrientes de un alimento
 */
async function insertFoodNutrients(foodId, nutrients, nutrientMap) {
  const nutrientsToInsert = [];
  
  for (const fn of nutrients) {
    const fdcNutrientId = fn.nutrient?.id;
    const amount = fn.amount;
    
    if (!fdcNutrientId || amount === null || amount === undefined) {
      continue;
    }
    
    const mapped = nutrientMap[fdcNutrientId];
    if (!mapped) {
      continue; // Nutriente no mapeado (no nos interesa)
    }
    
    nutrientsToInsert.push({
      food_id: foodId,
      nutrient_id: mapped.id,
      amount: amount,
      derivation_code: fn.type || null,
      data_points: fn.dataPoints || null,
      min_value: fn.min || null,
      max_value: fn.max || null
    });
  }
  
  if (nutrientsToInsert.length === 0) {
    console.log(`   ⚠️  No hay nutrientes mapeados`);
    return;
  }
  
  const { error } = await supabase
    .from('fdc.food_nutrients')
    .insert(nutrientsToInsert);
  
  if (error) {
    console.error(`   ❌ Error insertando nutrientes:`, error);
  } else {
    console.log(`   ✅ Insertados ${nutrientsToInsert.length} nutrientes`);
  }
}

/**
 * Insertar porciones de un alimento
 */
async function insertFoodPortions(foodId, portions) {
  if (!portions || portions.length === 0) {
    return;
  }
  
  const portionsToInsert = portions
    .filter(p => p.gramWeight > 0)
    .map(p => ({
      food_id: foodId,
      measure: p.modifier || p.measureUnit?.name || 'serving',
      gram_weight: p.gramWeight
    }));
  
  if (portionsToInsert.length === 0) {
    return;
  }
  
  const { error } = await supabase
    .from('fdc.portions')
    .insert(portionsToInsert);
  
  if (error) {
    console.error(`   ❌ Error insertando porciones:`, error);
  }
}

/**
 * Procesar y guardar un alimento completo
 */
async function processFoodItem(fdcId, nutrientMap) {
  // Verificar si ya existe
  if (await foodExists(fdcId)) {
    console.log(`   ⏭️  Ya existe (FDC ID: ${fdcId})`);
    return { skipped: true };
  }
  
  // Obtener detalles completos
  const details = await getFoodDetails(fdcId);
  if (!details) {
    console.log(`   ❌ No se pudieron obtener detalles`);
    return { error: true };
  }
  
  console.log(`   📦 Procesando: ${details.description}`);
  console.log(`      Tipo: ${details.dataType}`);
  console.log(`      Categoría: ${details.foodCategory || 'N/A'}`);
  
  // Insertar alimento
  const food = await insertFood(details);
  if (!food) {
    return { error: true };
  }
  
  // Insertar nutrientes
  await insertFoodNutrients(food.id, details.foodNutrients || [], nutrientMap);
  
  // Insertar porciones
  await insertFoodPortions(food.id, details.foodPortions || []);
  
  console.log(`   ✅ Completado (ID: ${food.id})`);
  
  return { imported: true, food };
}

/**
 * Crear log de importación
 */
async function createImportLog(importType) {
  const { data, error } = await supabase
    .from('fdc.import_log')
    .insert({
      import_type: importType,
      status: 'in_progress'
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creando log:', error);
    return null;
  }
  
  return data.id;
}

/**
 * Actualizar log de importación
 */
async function updateImportLog(logId, stats) {
  await supabase
    .from('fdc.import_log')
    .update({
      ...stats,
      completed_at: new Date().toISOString()
    })
    .eq('id', logId);
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('🚀 Iniciando descarga de datos de USDA FDC...\n');
  
  // Obtener mapeo de nutrientes
  console.log('📋 Cargando mapeo de nutrientes...');
  const nutrientMap = await getNutrientMap();
  console.log(`✅ Mapeados ${Object.keys(nutrientMap).length} nutrientes\n`);
  
  // Determinar términos de búsqueda
  const args = process.argv.slice(2);
  let searchTerms = DEFAULT_SEARCH_TERMS;
  
  if (args.length > 0 && args[0] !== '--full') {
    searchTerms = args[0].split(',');
  }
  
  console.log(`🔍 Buscando ${searchTerms.length} términos...\n`);
  
  // Crear log
  const logId = await createImportLog('manual');
  
  const stats = {
    foods_imported: 0,
    foods_updated: 0,
    foods_skipped: 0,
    status: 'completed'
  };
  
  // Procesar cada término
  for (const term of searchTerms) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔎 Término: "${term}"`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Buscar en FDC
    const results = await searchFDC(term, 10); // Top 10 por término
    
    if (!results.foods || results.foods.length === 0) {
      console.log(`   ⚠️  No se encontraron resultados\n`);
      continue;
    }
    
    // Filtrar solo Foundation y SR Legacy
    const qualityFoods = results.foods.filter(f => 
      DATA_TYPES.includes(f.dataType)
    );
    
    console.log(`\n   📊 Resultados de calidad: ${qualityFoods.length}\n`);
    
    // Procesar cada alimento
    for (const food of qualityFoods.slice(0, 5)) { // Top 5 de calidad
      const result = await processFoodItem(food.fdcId, nutrientMap);
      
      if (result.imported) {
        stats.foods_imported++;
      } else if (result.skipped) {
        stats.foods_skipped++;
      }
      
      // Delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Actualizar log
  if (logId) {
    await updateImportLog(logId, stats);
  }
  
  // Resumen final
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN DE IMPORTACIÓN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Importados: ${stats.foods_imported}`);
  console.log(`⏭️  Omitidos:   ${stats.foods_skipped}`);
  console.log(`📦 Total:      ${stats.foods_imported + stats.foods_skipped}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Importación completada\n');
  console.log('📝 Próximos pasos:');
  console.log('   1. Revisar alimentos importados en fdc.foods');
  console.log('   2. Agregar traducciones en fdc.food_translations');
  console.log('   3. Aprobar alimentos (is_approved = true)');
  console.log('   4. Migrar a tabla Food principal\n');
}

// Ejecutar
main().catch(console.error);
