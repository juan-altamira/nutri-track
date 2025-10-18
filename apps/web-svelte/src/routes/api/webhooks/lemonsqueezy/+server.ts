import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { LEMON_SQUEEZY_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import crypto from 'crypto';

// Cliente de Supabase con privilegios de servicio
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Verificar firma del webhook
function verifySignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', LEMON_SQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const signature = request.headers.get('x-signature');
    
    if (!signature) {
      console.error('[Webhook] No signature header');
      return json({ error: 'Missing signature' }, { status: 401 });
    }

    const rawBody = await request.text();
    
    // Verificar firma
    if (!verifySignature(rawBody, signature)) {
      console.error('[Webhook] Invalid signature');
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { meta, data } = event;
    const eventName = meta?.event_name;

    console.log('[Webhook] Event received:', eventName);

    // Extraer información de la suscripción
    const attributes = data?.attributes;
    const customData = attributes?.custom_data || {};
    const userId = customData.user_id;

    if (!userId) {
      console.error('[Webhook] No user_id in custom_data');
      return json({ error: 'Missing user_id' }, { status: 400 });
    }

    const subscriptionData = {
      userId,
      lemonsqueezySubscriptionId: String(data.id),
      lemonsqueezyCustomerId: String(attributes.customer_id),
      lemonsqueezyOrderId: String(attributes.order_id),
      lemonsqueezyProductId: String(attributes.product_id),
      lemonsqueezyVariantId: String(attributes.variant_id),
      status: attributes.status,
      renewsAt: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null,
      endsAt: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
      trialEndsAt: attributes.trial_ends_at ? new Date(attributes.trial_ends_at).toISOString() : null,
      updatePaymentMethodUrl: attributes.urls?.update_payment_method || null,
    };

    console.log('[Webhook] Subscription data:', JSON.stringify(subscriptionData, null, 2));

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        // Upsert: crear o actualizar suscripción
        const { error: upsertError } = await supabaseAdmin
          .from('Subscription')
          .upsert(
            {
              ...subscriptionData,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'userId' }
          );

        if (upsertError) {
          console.error('[Webhook] Upsert error:', upsertError);
          return json({ error: 'Database error' }, { status: 500 });
        }

        console.log('[Webhook] Subscription upserted:', subscriptionData.lemonsqueezySubscriptionId);
        break;

      case 'subscription_cancelled':
      case 'subscription_expired':
        // Actualizar estado a cancelado/expirado
        const { error: updateError } = await supabaseAdmin
          .from('Subscription')
          .update({
            status: attributes.status,
            endsAt: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
            updatedAt: new Date().toISOString(),
          })
          .eq('lemonsqueezySubscriptionId', String(data.id));

        if (updateError) {
          console.error('[Webhook] Update error:', updateError);
          return json({ error: 'Database error' }, { status: 500 });
        }

        console.log('[Webhook] Subscription updated:', eventName);
        break;

      case 'subscription_payment_success':
        // Renovar fecha de renovación
        const { error: renewError } = await supabaseAdmin
          .from('Subscription')
          .update({
            status: 'active',
            renewsAt: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null,
            updatedAt: new Date().toISOString(),
          })
          .eq('lemonsqueezySubscriptionId', String(data.id));

        if (renewError) {
          console.error('[Webhook] Renew error:', renewError);
          return json({ error: 'Database error' }, { status: 500 });
        }

        console.log('[Webhook] Payment successful');
        break;

      case 'subscription_payment_failed':
        // Marcar como past_due
        const { error: failError } = await supabaseAdmin
          .from('Subscription')
          .update({
            status: 'past_due',
            updatedAt: new Date().toISOString(),
          })
          .eq('lemonsqueezySubscriptionId', String(data.id));

        if (failError) {
          console.error('[Webhook] Fail error:', failError);
          return json({ error: 'Database error' }, { status: 500 });
        }

        console.log('[Webhook] Payment failed');
        break;

      default:
        console.log('[Webhook] Unhandled event:', eventName);
    }

    return json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
