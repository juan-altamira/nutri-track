/**
 * Script para agregar traducciones AR/ES a alimentos FDC
 * 
 * Formato: "Argentina/España"
 * Ejemplo: "Porotos/Judías", "Palta/Aguacate"
 * 
 * Uso:
 *   node add-translations.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TRADUCCIONES PREDEFINIDAS (top alimentos)
// ============================================================================

const TRANSLATIONS = {
  // Frutas
  'apple': { name: 'Manzana/Manzana', terms: ['manzana', 'apple'] },
  'banana': { name: 'Banana/Plátano', terms: ['banana', 'plátano', 'platano', 'guineo'] },
  'orange': { name: 'Naranja/Naranja', terms: ['naranja', 'orange'] },
  'strawberry': { name: 'Frutilla/Fresa', terms: ['frutilla', 'fresa', 'strawberry'] },
  'grape': { name: 'Uva/Uva', terms: ['uva', 'grape'] },
  'watermelon': { name: 'Sandía/Sandía', terms: ['sandia', 'sandía', 'watermelon'] },
  'pineapple': { name: 'Ananá/Piña', terms: ['anana', 'ananá', 'piña', 'pineapple'] },
  'mango': { name: 'Mango/Mango', terms: ['mango'] },
  'pear': { name: 'Pera/Pera', terms: ['pera', 'pear'] },
  'peach': { name: 'Durazno/Melocotón', terms: ['durazno', 'melocotón', 'melocoton', 'peach'] },
  'cherry': { name: 'Cereza/Cereza', terms: ['cereza', 'cherry', 'guinda'] },
  'kiwi': { name: 'Kiwi/Kiwi', terms: ['kiwi'] },
  'avocado': { name: 'Palta/Aguacate', terms: ['palta', 'aguacate', 'avocado'] },
  
  // Verduras
  'tomato': { name: 'Tomate/Tomate', terms: ['tomate', 'tomato', 'jitomate'] },
  'lettuce': { name: 'Lechuga/Lechuga', terms: ['lechuga', 'lettuce'] },
  'spinach': { name: 'Espinaca/Espinaca', terms: ['espinaca', 'spinach'] },
  'broccoli': { name: 'Brócoli/Brócoli', terms: ['brócoli', 'brocoli', 'broccoli'] },
  'carrot': { name: 'Zanahoria/Zanahoria', terms: ['zanahoria', 'carrot'] },
  'onion': { name: 'Cebolla/Cebolla', terms: ['cebolla', 'onion'] },
  'potato': { name: 'Papa/Patata', terms: ['papa', 'patata', 'potato'] },
  'sweet potato': { name: 'Batata/Boniato', terms: ['batata', 'boniato', 'camote', 'sweet potato'] },
  'bell pepper': { name: 'Morrón/Pimiento', terms: ['morrón', 'morron', 'pimiento', 'pepper', 'ají', 'aji'] },
  'cucumber': { name: 'Pepino/Pepino', terms: ['pepino', 'cucumber'] },
  'zucchini': { name: 'Calabacín/Calabacín', terms: ['calabacín', 'calabacin', 'zucchini', 'zapallito'] },
  'cabbage': { name: 'Repollo/Col', terms: ['repollo', 'col', 'cabbage'] },
  'cauliflower': { name: 'Coliflor/Coliflor', terms: ['coliflor', 'cauliflower'] },
  
  // Proteínas
  'chicken breast': { name: 'Pechuga de pollo/Pechuga de pollo', terms: ['pechuga', 'pollo', 'chicken', 'breast'] },
  'chicken thigh': { name: 'Muslo de pollo/Muslo de pollo', terms: ['muslo', 'pollo', 'chicken', 'thigh'] },
  'beef': { name: 'Carne vacuna/Carne de res', terms: ['carne', 'vacuna', 'res', 'beef', 'ternera'] },
  'pork': { name: 'Carne de cerdo/Carne de cerdo', terms: ['cerdo', 'chancho', 'pork', 'puerco'] },
  'salmon': { name: 'Salmón/Salmón', terms: ['salmón', 'salmon'] },
  'tuna': { name: 'Atún/Atún', terms: ['atún', 'atun', 'tuna'] },
  'egg': { name: 'Huevo/Huevo', terms: ['huevo', 'egg'] },
  'turkey': { name: 'Pavo/Pavo', terms: ['pavo', 'turkey', 'guajolote'] },
  'shrimp': { name: 'Camarón/Gamba', terms: ['camarón', 'camaron', 'gamba', 'shrimp', 'langostino'] },
  
  // Legumbres
  'black beans': { name: 'Porotos negros/Judías negras', terms: ['porotos', 'judías', 'judias', 'frijoles', 'alubias', 'beans', 'negro', 'negros', 'negras'] },
  'kidney beans': { name: 'Porotos colorados/Judías rojas', terms: ['porotos', 'judías', 'judias', 'frijoles', 'kidney', 'colorado', 'rojo', 'rojas'] },
  'chickpeas': { name: 'Garbanzos/Garbanzos', terms: ['garbanzos', 'chickpeas'] },
  'lentils': { name: 'Lentejas/Lentejas', terms: ['lentejas', 'lentils'] },
  'pinto beans': { name: 'Porotos pintos/Judías pintas', terms: ['porotos', 'judías', 'judias', 'frijoles', 'pinto', 'pintos', 'pintas'] },
  
  // Granos
  'rice': { name: 'Arroz/Arroz', terms: ['arroz', 'rice'] },
  'oats': { name: 'Avena/Avena', terms: ['avena', 'oats'] },
  'quinoa': { name: 'Quinoa/Quinoa', terms: ['quinoa', 'quinua'] },
  'pasta': { name: 'Fideos/Pasta', terms: ['fideos', 'pasta', 'macarrones', 'espagueti'] },
  'bread': { name: 'Pan/Pan', terms: ['pan', 'bread'] },
  'corn': { name: 'Maíz/Maíz', terms: ['maíz', 'maiz', 'corn', 'choclo', 'elote'] },
  
  // Lácteos
  'milk': { name: 'Leche/Leche', terms: ['leche', 'milk'] },
  'yogurt': { name: 'Yogur/Yogur', terms: ['yogur', 'yogurt'] },
  'cheese': { name: 'Queso/Queso', terms: ['queso', 'cheese'] },
  'butter': { name: 'Manteca/Mantequilla', terms: ['manteca', 'mantequilla', 'butter'] },
  'cream': { name: 'Crema/Nata', terms: ['crema', 'nata', 'cream'] },
  
  // Frutos secos
  'almonds': { name: 'Almendras/Almendras', terms: ['almendras', 'almonds'] },
  'walnuts': { name: 'Nueces/Nueces', terms: ['nueces', 'walnuts'] },
  'peanuts': { name: 'Maní/Cacahuetes', terms: ['maní', 'mani', 'cacahuetes', 'cacahuate', 'peanuts'] },
  'cashews': { name: 'Castañas de cajú/Anacardos', terms: ['castañas', 'cajú', 'caju', 'anacardos', 'cashews', 'marañón'] },
  'pistachios': { name: 'Pistachos/Pistachos', terms: ['pistachos', 'pistachios'] },
  
  // Aceites
  'olive oil': { name: 'Aceite de oliva/Aceite de oliva', terms: ['aceite', 'oliva', 'olive', 'oil'] },
  'canola oil': { name: 'Aceite de canola/Aceite de colza', terms: ['aceite', 'canola', 'colza', 'oil'] },
  'sunflower oil': { name: 'Aceite de girasol/Aceite de girasol', terms: ['aceite', 'girasol', 'sunflower', 'oil'] }
};

// ============================================================================
// FUNCIONES
// ============================================================================

/**
 * Buscar alimento FDC por descripción
 */
async function findFoodByDescription(searchTerm) {
  const { data, error } = await supabase
    .from('fdc.foods')
    .select('id, fdc_id, description, data_type, quality_score')
    .ilike('description', `%${searchTerm}%`)
    .order('quality_score', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error buscando:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Agregar traducción a un alimento
 */
async function addTranslation(foodId, translation) {
  const { error } = await supabase
    .from('fdc.food_translations')
    .upsert({
      food_id: foodId,
      lang: 'es',
      name: translation.name,
      search_terms: translation.terms,
      is_verified: true
    }, {
      onConflict: 'food_id,lang'
    });
  
  if (error) {
    console.error(`   ❌ Error agregando traducción:`, error);
    return false;
  }
  
  return true;
}

/**
 * Modo interactivo para revisar y confirmar traducciones
 */
async function interactiveMode(searchTerm, translation) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 Buscando: "${searchTerm}"`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const foods = await findFoodByDescription(searchTerm);
  
  if (foods.length === 0) {
    console.log(`   ⚠️  No se encontraron alimentos\n`);
    return 0;
  }
  
  console.log(`📦 Encontrados ${foods.length} alimentos:\n`);
  
  let count = 0;
  
  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    console.log(`${i + 1}. ${food.description}`);
    console.log(`   FDC ID: ${food.fdc_id} | Tipo: ${food.data_type} | Calidad: ${food.quality_score}/3`);
    
    // Agregar traducción automáticamente al primero de máxima calidad
    if (i === 0) {
      const success = await addTranslation(food.id, translation);
      if (success) {
        console.log(`   ✅ Traducción agregada: "${translation.name}"`);
        count++;
      }
    }
    
    console.log('');
  }
  
  return count;
}

/**
 * Modo batch: agregar todas las traducciones predefinidas
 */
async function batchMode() {
  console.log('🚀 Modo batch: procesando todas las traducciones predefinidas\n');
  
  let totalAdded = 0;
  const terms = Object.keys(TRANSLATIONS);
  
  for (let i = 0; i < terms.length; i++) {
    const searchTerm = terms[i];
    const translation = TRANSLATIONS[searchTerm];
    
    console.log(`[${i + 1}/${terms.length}] Procesando: "${searchTerm}"...`);
    
    const count = await interactiveMode(searchTerm, translation);
    totalAdded += count;
    
    // Delay para no saturar
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return totalAdded;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 AGREGAR TRADUCCIONES AR/ES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const totalAdded = await batchMode();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Traducciones agregadas: ${totalAdded}`);
  console.log(`📝 Términos procesados: ${Object.keys(TRANSLATIONS).length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ Completado\n');
}

main().catch(console.error);
