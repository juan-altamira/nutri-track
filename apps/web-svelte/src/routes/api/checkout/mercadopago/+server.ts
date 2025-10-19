import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_MERCADOPAGO_PUBLIC_KEY } from '$env/static/public';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Cliente de Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
});
const preference = new Preference(client);

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Checkout MP] Iniciando...');
    
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

    // Crear preferencia de Mercado Pago
    // Nota: Mercado Pago no tiene suscripciones nativas como Lemon Squeezy
    // Por ahora creamos un pago único, luego implementaremos suscripciones recurrentes
    const preferenceData = await preference.create({
      body: {
        items: [
          {
            id: 'nutri-track-monthly',
            title: 'Nutri-Track - Suscripción Mensual',
            description: 'Acceso completo a todas las funcionalidades',
            quantity: 1,
            unit_price: 9900, // ARS 9,900
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: userEmail,
          name: userName,
        },
        back_urls: {
          success: 'https://www.nutri-track.pro/subscription/success',
          failure: 'https://www.nutri-track.pro/subscription',
          pending: 'https://www.nutri-track.pro/subscription',
        },
        auto_return: 'approved',
        notification_url: 'https://www.nutri-track.pro/api/webhooks/mercadopago',
        metadata: {
          user_id: userId,
          user_email: userEmail,
          region: 'argentina',
        },
      },
    });

    console.log('[Checkout MP] Preference created:', preferenceData.id);

    // Retornar URL del checkout
    const checkoutUrl = preferenceData.init_point || preferenceData.sandbox_init_point;

    return json({ checkoutUrl });
  } catch (err: any) {
    console.error('[Checkout MP] Error:', err);
    return json({ 
      error: err?.message || 'Error al crear checkout de Mercado Pago',
      details: err?.toString(),
    }, { status: 500 });
  }
};
