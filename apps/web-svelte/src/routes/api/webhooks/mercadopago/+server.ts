import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Cliente de Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Webhook MP] Iniciando...');
    
    const body = await request.json();
    console.log('[Webhook MP] Body:', JSON.stringify(body, null, 2));

    // Mercado Pago envía notificaciones en este formato:
    // { type: 'payment', data: { id: 'payment_id' } }
    const notificationType = body.type;
    
    if (notificationType !== 'payment') {
      console.log('[Webhook MP] Tipo de notificación no soportado:', notificationType);
      return json({ received: true });
    }

    const paymentId = body.data?.id;
    
    if (!paymentId) {
      console.error('[Webhook MP] No se encontró payment ID');
      return json({ error: 'Missing payment ID' }, { status: 400 });
    }

    console.log('[Webhook MP] Payment ID:', paymentId);

    // Obtener detalles del pago desde Mercado Pago
    const paymentInfo = await payment.get({ id: paymentId });
    
    console.log('[Webhook MP] Payment info:', {
      id: paymentInfo.id,
      status: paymentInfo.status,
      metadata: paymentInfo.metadata,
    });

    // Extraer user_id de metadata
    const userId = paymentInfo.metadata?.user_id;
    
    if (!userId) {
      console.error('[Webhook MP] No se encontró user_id en metadata');
      return json({ error: 'Missing user_id in metadata' }, { status: 400 });
    }

    // Mapear status de Mercado Pago a nuestro sistema
    let subscriptionStatus = 'active';
    
    if (paymentInfo.status === 'approved') {
      subscriptionStatus = 'on_trial'; // Primera compra = trial
    } else if (paymentInfo.status === 'pending') {
      subscriptionStatus = 'past_due';
    } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
      subscriptionStatus = 'cancelled';
    }

    // Buscar o crear suscripción
    const { data: existingSub } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .single();

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 días
    const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días

    if (existingSub) {
      // Actualizar suscripción existente
      console.log('[Webhook MP] Actualizando suscripción existente:', existingSub.id);
      
      const { error } = await supabaseAdmin
        .from('Subscription')
        .update({
          status: subscriptionStatus,
          paymentProvider: 'mercadopago',
          mercadopagoSubscriptionId: String(paymentInfo.id),
          mercadopagoCustomerId: String(paymentInfo.payer?.id || ''),
          region: 'argentina',
          updatedAt: now.toISOString(),
        })
        .eq('id', existingSub.id);

      if (error) {
        console.error('[Webhook MP] Error al actualizar:', error);
        throw error;
      }
    } else {
      // Crear nueva suscripción
      console.log('[Webhook MP] Creando nueva suscripción');
      
      const { error } = await supabaseAdmin
        .from('Subscription')
        .insert({
          userId: userId,
          status: subscriptionStatus,
          paymentProvider: 'mercadopago',
          mercadopagoSubscriptionId: String(paymentInfo.id),
          mercadopagoCustomerId: String(paymentInfo.payer?.id || ''),
          region: 'argentina',
          trialEndsAt: trialEndsAt.toISOString(),
          renewsAt: renewsAt.toISOString(),
        });

      if (error) {
        console.error('[Webhook MP] Error al crear:', error);
        throw error;
      }
    }

    console.log('[Webhook MP] Suscripción procesada exitosamente');
    
    return json({ received: true });
  } catch (err: any) {
    console.error('[Webhook MP] Error:', err);
    return json({ 
      error: err?.message || 'Error processing webhook',
      details: err?.toString(),
    }, { status: 500 });
  }
};

// Mercado Pago también puede enviar GET requests para validar el endpoint
export const GET: RequestHandler = async () => {
  return json({ status: 'Mercado Pago webhook endpoint ready' });
};
