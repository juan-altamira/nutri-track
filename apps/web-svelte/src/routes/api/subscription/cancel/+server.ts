import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { LEMON_SQUEEZY_API_KEY, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

// Cliente de Supabase con privilegios de servicio (bypasea RLS)
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Cancel Subscription] Iniciando...');
    
    const body = await request.json();
    const { subscriptionId, userId } = body;

    console.log('[Cancel Subscription] Body:', { subscriptionId, userId });

    if (!subscriptionId || !userId) {
      console.error('[Cancel Subscription] Datos incompletos');
      return json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Buscar la suscripción específica por ID
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('id', subscriptionId);

    console.log('[Cancel Subscription] Query result:', { 
      count: subscriptions?.length,
      error: subError,
    });

    if (subError) {
      console.error('[Cancel Subscription] Error en query:', subError);
      return json({ 
        error: 'Error al buscar suscripción',
        details: subError.message,
      }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.error('[Cancel Subscription] No se encontró suscripción');
      return json({ 
        error: 'Suscripción no encontrada',
      }, { status: 404 });
    }

    const subscription = subscriptions[0];

    // Verificar que pertenece al usuario
    if (subscription.userId !== userId) {
      console.error('[Cancel Subscription] UserId no coincide');
      return json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('[Cancel Subscription] Subscription found:', {
      id: subscription.id,
      provider: subscription.paymentProvider,
    });

    // Determinar proveedor y cancelar apropiadamente
    const provider = subscription.paymentProvider || 'lemonsqueezy';
    let endsAt = null;

    if (provider === 'mercadopago') {
      // Cancelar en Mercado Pago
      console.log('[Cancel Subscription] Cancelando en Mercado Pago...');
      console.log('[Cancel Subscription] MP Subscription ID:', subscription.mercadopagoSubscriptionId);

      if (!subscription.mercadopagoSubscriptionId) {
        throw new Error('No se encontró ID de suscripción de Mercado Pago');
      }

      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${subscription.mercadopagoSubscriptionId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled',
          }),
        }
      );

      console.log('[Cancel Subscription] MP Response status:', mpResponse.status);

      if (!mpResponse.ok) {
        const error = await mpResponse.text();
        console.error('[Cancel Subscription] Mercado Pago error:', error);
        throw new Error('Error al cancelar en Mercado Pago: ' + error);
      }

      const mpResult = await mpResponse.json();
      console.log('[Cancel Subscription] MP Result:', {
        id: mpResult.id,
        status: mpResult.status,
      });

      // MP no tiene "ends_at" específico, usar la fecha de renovación
      endsAt = subscription.renewsAt || new Date().toISOString();

    } else {
      // Cancelar en Lemon Squeezy (lógica original)
      console.log('[Cancel Subscription] Cancelando en Lemon Squeezy...');
      console.log('[Cancel Subscription] LS Subscription ID:', subscription.lemonsqueezySubscriptionId);

      if (!subscription.lemonsqueezySubscriptionId) {
        throw new Error('No se encontró ID de suscripción de Lemon Squeezy');
      }
      
      const lsResponse = await fetch(
        `${LEMONSQUEEZY_API_URL}/subscriptions/${subscription.lemonsqueezySubscriptionId}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}`,
          },
        }
      );

      console.log('[Cancel Subscription] LS Response status:', lsResponse.status);

      if (!lsResponse.ok) {
        const error = await lsResponse.text();
        console.error('[Cancel Subscription] Lemon Squeezy error:', error);
        throw new Error('Error al cancelar en Lemon Squeezy: ' + error);
      }

      const lsResult = await lsResponse.json();
      console.log('[Cancel Subscription] LS Result:', lsResult.data.attributes);
      
      endsAt = lsResult.data.attributes.ends_at;
    }

    // Actualizar en nuestra base de datos
    console.log('[Cancel Subscription] Actualizando DB...');
    const { error: updateError } = await supabaseAdmin
      .from('Subscription')
      .update({
        status: 'cancelled',
        endsAt: endsAt,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[Cancel Subscription] Database update error:', updateError);
      // No fallar si la DB update falla
    }

    console.log('[Cancel Subscription] Completado exitosamente');
    return json({ 
      success: true,
      endsAt: endsAt,
      provider: provider,
    });
  } catch (err: any) {
    console.error('[Cancel Subscription] Error:', err);
    return json(
      { error: err?.message || 'Error al cancelar suscripción' },
      { status: 500 }
    );
  }
};
