import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY, LEMON_SQUEEZY_WEBHOOK_SECRET } from '$env/static/private';
import crypto from 'crypto';

// Cliente de Supabase con service role para bypass RLS
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');

    // Verificar la firma del webhook
    if (!signature) {
      throw error(401, 'Firma faltante');
    }

    const hmac = crypto.createHmac('sha256', LEMON_SQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(rawBody).digest('hex');

    if (digest !== signature) {
      throw error(401, 'Firma inválida');
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const data = payload.data;

    console.log('[Lemon Squeezy Webhook]:', eventName);

    // Manejar diferentes eventos
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(data);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(data);
        break;

      case 'subscription_cancelled':
      case 'subscription_expired':
        await handleSubscriptionCancelled(data);
        break;

      case 'subscription_resumed':
        await handleSubscriptionResumed(data);
        break;

      case 'subscription_payment_success':
        await handlePaymentSuccess(data);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(data);
        break;

      default:
        console.log('[Webhook] Evento no manejado:', eventName);
    }

    return json({ received: true });

  } catch (err) {
    console.error('[Webhook Error]:', err);
    throw error(500, 'Error procesando webhook');
  }
};

async function handleSubscriptionCreated(data: any) {
  const userId = data.attributes.custom_data?.user_id;
  
  if (!userId) {
    console.error('[Webhook] user_id no encontrado en custom_data');
    return;
  }

  const { error: dbError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      lemon_squeezy_subscription_id: data.id,
      lemon_squeezy_customer_id: data.attributes.customer_id,
      lemon_squeezy_order_id: data.attributes.order_id,
      lemon_squeezy_product_id: data.attributes.product_id,
      lemon_squeezy_variant_id: data.attributes.variant_id,
      status: data.attributes.status,
      product_name: data.attributes.product_name,
      variant_name: data.attributes.variant_name,
      price: data.attributes.subtotal / 100, // Convertir de centavos
      currency: 'ARS',
      trial_ends_at: data.attributes.trial_ends_at,
      renews_at: data.attributes.renews_at,
      ends_at: data.attributes.ends_at,
      is_trial: data.attributes.status === 'on_trial',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (dbError) {
    console.error('[DB Error]:', dbError);
  } else {
    console.log('[Subscription Created] User:', userId);
  }
}

async function handleSubscriptionUpdated(data: any) {
  const { error: dbError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: data.attributes.status,
      trial_ends_at: data.attributes.trial_ends_at,
      renews_at: data.attributes.renews_at,
      ends_at: data.attributes.ends_at,
      is_trial: data.attributes.status === 'on_trial',
      cancel_at_period_end: data.attributes.cancelled,
      updated_at: new Date().toISOString()
    })
    .eq('lemon_squeezy_subscription_id', data.id);

  if (dbError) {
    console.error('[DB Error]:', dbError);
  } else {
    console.log('[Subscription Updated]:', data.id);
  }
}

async function handleSubscriptionCancelled(data: any) {
  const { error: dbError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      ends_at: data.attributes.ends_at,
      updated_at: new Date().toISOString()
    })
    .eq('lemon_squeezy_subscription_id', data.id);

  if (dbError) {
    console.error('[DB Error]:', dbError);
  } else {
    console.log('[Subscription Cancelled]:', data.id);
  }
}

async function handleSubscriptionResumed(data: any) {
  const { error: dbError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: data.attributes.status,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    })
    .eq('lemon_squeezy_subscription_id', data.id);

  if (dbError) {
    console.error('[DB Error]:', dbError);
  } else {
    console.log('[Subscription Resumed]:', data.id);
  }
}

async function handlePaymentSuccess(data: any) {
  console.log('[Payment Success]:', data.id);
  // Aquí podrías enviar un email de confirmación, etc.
}

async function handlePaymentFailed(data: any) {
  const { error: dbError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('lemon_squeezy_subscription_id', data.id);

  if (dbError) {
    console.error('[DB Error]:', dbError);
  } else {
    console.log('[Payment Failed]:', data.id);
  }
}
