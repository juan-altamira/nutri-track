import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { createCheckout } from '$lib/lemonsqueezy';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Checkout] Iniciando...');
    
    // Obtener datos del body (enviados por el cliente)
    const body = await request.json();
    const { userId, userEmail, userName } = body;
    
    console.log('[Checkout] User data:', { userId, userEmail, userName });

    if (!userId || !userEmail) {
      console.error('[Checkout] Datos de usuario incompletos');
      return json({ error: 'Datos de usuario incompletos' }, { status: 400 });
    }

    // Verificar si el usuario ya tiene o tuvo una suscripción (usar admin client)
    const { data: existingSubs } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('userId', userId);

    console.log('[Checkout] Suscripciones existentes:', existingSubs?.length || 0);

    const existingSub = existingSubs && existingSubs.length > 0 ? existingSubs[0] : null;
    const isRenewal = existingSub !== null; // Si ya tuvo suscripción, es renovación

    if (existingSub) {
      // Si ya tiene una suscripción activa o en trial
      if (['active', 'on_trial'].includes(existingSub.status)) {
        return json({ error: 'Ya tenés una suscripción activa' }, { status: 400 });
      }
      console.log('[Checkout] Usuario renovando - SIN trial');
    } else {
      console.log('[Checkout] Usuario nuevo - CON trial');
    }

    // Crear checkout en Lemon Squeezy
    const checkoutUrl = await createCheckout({
      userId,
      userEmail,
      userName,
      isRenewal, // Indicar si es renovación
    });

    return json({ checkoutUrl });
  } catch (err: any) {
    console.error('[Checkout] Error:', err);
    return json({ 
      error: err?.message || 'Failed to create checkout',
      details: err?.toString(),
    }, { status: 500 });
  }
};
