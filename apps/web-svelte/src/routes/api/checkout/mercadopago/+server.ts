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

    // Obtener el plan para generar la URL de checkout
    console.log('[Checkout MP] Obteniendo plan:', env.MERCADOPAGO_PLAN_ID);
    
    const planResponse = await fetch(`https://api.mercadopago.com/preapproval_plan/${env.MERCADOPAGO_PLAN_ID}`, {
      headers: {
        'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!planResponse.ok) {
      console.error('[Checkout MP] Error al obtener plan');
      throw new Error('Error al obtener plan de suscripción');
    }

    const plan = await planResponse.json();
    console.log('[Checkout MP] Plan obtenido:', plan.id);

    // Construir URL de checkout con external_reference y email
    const checkoutUrl = new URL(plan.init_point);
    checkoutUrl.searchParams.append('external_reference', userId);
    checkoutUrl.searchParams.append('payer_email', userEmail);

    console.log('[Checkout MP] Checkout URL generada:', checkoutUrl.toString());

    // Retornar URL de checkout
    return json({
      checkoutUrl: checkoutUrl.toString(),
      planId: plan.id,
    });
  } catch (err: any) {
    console.error('[Checkout MP] Error:', err);
    return json({ 
      error: err?.message || 'Error al crear checkout de Mercado Pago',
      details: err?.toString(),
    }, { status: 500 });
  }
};
