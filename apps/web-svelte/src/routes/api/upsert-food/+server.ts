import { json, error, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

const allowed = new Set([
  'protein','carbohydrates','fat','fiber',
  'vitaminA','vitaminC','vitaminD','vitaminE','vitaminK',
  'vitaminB1','vitaminB2','vitaminB3','vitaminB5','vitaminB6','vitaminB7','vitaminB12','folate',
  'calcium','iron','magnesium','zinc','potassium','sodium','phosphorus','selenium','copper','manganese','iodine',
  'choline','chloride'
]);

const allowedUnits = new Set(['g', 'mg', 'µg']);

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || !Array.isArray(body.nutrients)) {
    throw error(400, 'Entrada inválida: se requiere { name: string, nutrients: Array }');
  }

  const name = body.name.trim();
  if (!name) throw error(400, 'Nombre de alimento inválido');

  const clean = [] as Array<{ nutrient: string; value: number; unit: 'g'|'mg'|'µg' }>;

  for (const it of body.nutrients) {
    if (!it || typeof it.nutrient !== 'string') continue;
    const nutrient = it.nutrient.trim();
    if (!allowed.has(nutrient)) continue; // ignorar no soportados

    const unitRaw = (it.unit ?? '').toString().trim().toLowerCase().replace('μ','µ');
    if (!allowedUnits.has(unitRaw)) continue;

    const valueNum = Number(it.value);
    if (!Number.isFinite(valueNum) || valueNum < 0) continue;

    // No enviamos valores en 0 para evitar sobrescribir con 0 innecesariamente
    if (valueNum === 0) continue;

    clean.push({ nutrient, value: valueNum, unit: unitRaw as 'g'|'mg'|'µg' });
  }

  // Llamar RPC (SECURITY DEFINER) expuesto por PostgREST
  const { data, error: rpcError } = await supabase.rpc('upsert_global_food', {
    p_name: name,
    p_nutrients: clean
  } as any);

  if (rpcError) {
    throw error(500, `Fallo upsert_global_food: ${rpcError.message}`);
  }

  return json({ id: data }, { headers: { 'cache-control': 'no-store' } });
};
