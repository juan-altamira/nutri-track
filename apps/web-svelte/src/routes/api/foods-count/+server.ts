import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const GET: RequestHandler = async () => {
  const { count: food_count, error: e1 } = await supabase
    .from('Food')
    .select('*', { count: 'exact', head: true });

  const { count: foodnutrient_count, error: e2 } = await supabase
    .from('FoodNutrient')
    .select('*', { count: 'exact', head: true });

  if (e1 || e2) {
    return json({ error: e1?.message || e2?.message }, { status: 500 });
  }

  return json({ food_count, foodnutrient_count }, { headers: { 'cache-control': 'no-store' } });
};
