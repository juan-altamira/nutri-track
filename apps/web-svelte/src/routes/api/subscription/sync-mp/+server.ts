/**
 * API Endpoint para sincronizar suscripción de Mercado Pago
 * 
 * Este endpoint actúa como FALLBACK si el webhook no llega.
 * La página /subscription/success lo llama para asegurar que
 * la suscripción se cree incluso si el webhook falla.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { preapprovalId, userId } = body as { preapprovalId: string; userId: string };

    console.log('[Sync MP] Iniciando sincronización...');
    console.log('[Sync MP] Preapproval ID:', preapprovalId);
    console.log('[Sync MP] User ID:', userId);

    if (!preapprovalId || !userId) {
      return json({ error: 'Missing preapprovalId or userId' }, { status: 400 });
    }

    // 1. Verificar si ya existe la suscripción
    const { data: existingSub } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .single();

    if (existingSub) {
      console.log('[Sync MP] Suscripción ya existe:', existingSub.id);
      return json({ 
        success: true, 
        exists: true,
        subscription: existingSub 
      });
    }

    console.log('[Sync MP] No existe suscripción, creando...');

    // 2. Obtener detalles de la suscripción desde Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        headers: {
          'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!mpResponse.ok) {
      console.error('[Sync MP] Error al obtener preapproval:', mpResponse.status);
      const errorText = await mpResponse.text();
      console.error('[Sync MP] Error:', errorText);
      return json({ 
        error: 'Error fetching preapproval from MP',
        details: errorText 
      }, { status: 500 });
    }

    const preapprovalInfo = await mpResponse.json();

    console.log('[Sync MP] Preapproval info:', {
      id: preapprovalInfo.id,
      status: preapprovalInfo.status,
      payer_id: preapprovalInfo.payer_id,
      next_payment_date: preapprovalInfo.next_payment_date,
    });

    // 3. Crear la suscripción
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 días
    const nextPaymentDate = preapprovalInfo.next_payment_date 
      ? new Date(preapprovalInfo.next_payment_date)
      : trialEndsAt;

    // Mapear status
    let subscriptionStatus = 'on_trial';
    if (preapprovalInfo.status === 'authorized') {
      subscriptionStatus = 'on_trial';
    } else if (preapprovalInfo.status === 'paused') {
      subscriptionStatus = 'paused';
    } else if (preapprovalInfo.status === 'cancelled') {
      subscriptionStatus = 'cancelled';
    }

    const { data: newSub, error: createError } = await supabaseAdmin
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
      })
      .select()
      .single();

    if (createError) {
      console.error('[Sync MP] Error al crear suscripción:', createError);
      return json({ 
        error: 'Error creating subscription',
        details: createError 
      }, { status: 500 });
    }

    console.log('[Sync MP] ✅ Suscripción creada exitosamente:', newSub.id);

    return json({ 
      success: true, 
      created: true,
      subscription: newSub 
    });

  } catch (err: any) {
    console.error('[Sync MP] Error:', err);
    return json({ 
      error: err?.message || 'Unknown error',
      details: err?.toString(),
    }, { status: 500 });
  }
};
