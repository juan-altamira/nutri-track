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
    console.log('[Webhook MP] Iniciando...');
    
    const body = await request.json();
    console.log('[Webhook MP] Body:', JSON.stringify(body, null, 2));

    // Mercado Pago envía notificaciones de preapproval:
    // { action: "created/updated", type: "subscription_preapproval", data: { id: "preapproval_id" } }
    const notificationType = body.type || body.topic;
    const action = body.action;
    
    console.log('[Webhook MP] Type:', notificationType, 'Action:', action);
    
    // Solo procesar notificaciones de suscripciones
    if (notificationType !== 'subscription_preapproval' && notificationType !== 'preapproval') {
      console.log('[Webhook MP] Tipo no soportado, ignorando');
      return json({ received: true });
    }

    const preapprovalId = body.data?.id || body.id;
    
    if (!preapprovalId) {
      console.error('[Webhook MP] No se encontró preapproval ID');
      return json({ error: 'Missing preapproval ID' }, { status: 400 });
    }

    console.log('[Webhook MP] Preapproval ID:', preapprovalId);

    // Obtener detalles de la suscripción desde Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: {
        'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('[Webhook MP] Error al obtener preapproval:', response.status);
      return json({ error: 'Error fetching preapproval' }, { status: 500 });
    }

    const preapprovalInfo = await response.json();
    
    console.log('[Webhook MP] Preapproval info:', {
      id: preapprovalInfo.id,
      status: preapprovalInfo.status,
      external_reference: preapprovalInfo.external_reference,
      payer_email: preapprovalInfo.payer_email,
    });

    // Extraer user_id de external_reference
    const userId = preapprovalInfo.external_reference;
    
    if (!userId) {
      console.error('[Webhook MP] No se encontró user_id en external_reference');
      return json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Mapear status de Mercado Pago a nuestro sistema
    // authorized: suscripción autorizada (en trial o activa)
    // paused: pausada
    // cancelled: cancelada
    let subscriptionStatus = 'active';
    
    if (preapprovalInfo.status === 'authorized') {
      subscriptionStatus = 'on_trial'; // Durante el trial
    } else if (preapprovalInfo.status === 'paused') {
      subscriptionStatus = 'paused';
    } else if (preapprovalInfo.status === 'cancelled') {
      subscriptionStatus = 'cancelled';
    }

    // Buscar suscripción existente
    const { data: existingSub } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .single();

    const now = new Date();
    
    // Calcular fechas basadas en auto_recurring del plan
    const nextPaymentDate = preapprovalInfo.next_payment_date 
      ? new Date(preapprovalInfo.next_payment_date)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existingSub) {
      // Actualizar suscripción existente
      console.log('[Webhook MP] Actualizando suscripción existente:', existingSub.id);
      
      const { error } = await supabaseAdmin
        .from('Subscription')
        .update({
          status: subscriptionStatus,
          paymentProvider: 'mercadopago',
          mercadopagoSubscriptionId: preapprovalInfo.id,
          mercadopagoCustomerId: String(preapprovalInfo.payer_id || ''),
          region: 'argentina',
          renewsAt: nextPaymentDate.toISOString(),
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
      
      const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 días
      
      const { error } = await supabaseAdmin
        .from('Subscription')
        .insert({
          userId: userId,
          status: subscriptionStatus,
          paymentProvider: 'mercadopago',
          mercadopagoSubscriptionId: preapprovalInfo.id,
          mercadopagoCustomerId: String(preapprovalInfo.payer_id || ''),
          region: 'argentina',
          trialEndsAt: trialEndsAt.toISOString(),
          renewsAt: nextPaymentDate.toISOString(),
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
