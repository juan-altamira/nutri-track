import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Checkout MP] Iniciando...');
    console.log('[Checkout MP] MERCADOPAGO_PLAN_ID:', env.MERCADOPAGO_PLAN_ID);
    console.log('[Checkout MP] MERCADOPAGO_ACCESS_TOKEN:', env.MERCADOPAGO_ACCESS_TOKEN ? 'EXISTE' : 'NO EXISTE');
    
    // Obtener datos del body
    const body = await request.json();
    const { userId, userEmail, userName } = body;
    
    console.log('[Checkout MP] User data:', { userId, userEmail, userName });

    if (!userId || !userEmail) {
      console.error('[Checkout MP] Datos de usuario incompletos');
      return json({ error: 'Datos de usuario incompletos' }, { status: 400 });
    }

    // Verificar si el usuario ya tiene una suscripción activa
    const { data: existingSubs } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('userId', userId);

    console.log('[Checkout MP] Suscripciones existentes:', existingSubs?.length || 0);

    const existingSub = existingSubs && existingSubs.length > 0 ? existingSubs[0] : null;

    if (existingSub) {
      // Si ya tiene una suscripción activa o en trial
      if (['active', 'on_trial'].includes(existingSub.status)) {
        return json({ error: 'Ya tenés una suscripción activa' }, { status: 400 });
      }
      console.log('[Checkout MP] Usuario renovando');
    } else {
      console.log('[Checkout MP] Usuario nuevo');
    }

    // Crear suscripción (preapproval) en Mercado Pago
    const subscriptionData = {
      preapproval_plan_id: env.MERCADOPAGO_PLAN_ID,
      reason: 'Nutri-Track - Suscripción Mensual',
      payer_email: userEmail,
      back_url: 'https://www.nutri-track.pro/subscription/success',
      external_reference: userId,
    };

    console.log('[Checkout MP] Creating preapproval with plan:', env.MERCADOPAGO_PLAN_ID);
    console.log('[Checkout MP] Request body:', JSON.stringify(subscriptionData, null, 2));

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Checkout MP] Error creating preapproval:', result);
      throw new Error(result.message || 'Error al crear suscripción en Mercado Pago');
    }

    console.log('[Checkout MP] Preapproval created:', {
      id: result.id,
      status: result.status,
      init_point: result.init_point,
    });

    // Retornar URL del checkout
    const checkoutUrl = result.init_point || result.sandbox_init_point;

    return json({ checkoutUrl });
  } catch (err: any) {
    console.error('[Checkout MP] Error:', err);
    return json({ 
      error: err?.message || 'Error al crear checkout de Mercado Pago',
      details: err?.toString(),
    }, { status: 500 });
  }
};
