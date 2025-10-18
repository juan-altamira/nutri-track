import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { LEMON_SQUEEZY_API_KEY, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

// Cliente de Supabase con privilegios de servicio (bypasea RLS)
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    console.log('[Cancel Subscription] Iniciando...');
    
    const body = await request.json();
    const { subscriptionId, userId } = body;

    console.log('[Cancel Subscription] Body:', { subscriptionId, userId });

    if (!subscriptionId || !userId) {
      console.error('[Cancel Subscription] Datos incompletos');
      return json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Primero buscar por userId para ver qué suscripciones tiene (usando admin client)
    const { data: allUserSubs, error: allSubsError } = await supabaseAdmin
      .from('Subscription')
      .select('id, userId, status')
      .eq('userId', userId);

    console.log('[Cancel Subscription] Todas las subs del usuario:', {
      count: allUserSubs?.length,
      subs: allUserSubs,
    });

    // Ahora buscar la suscripción específica por ID (usando admin client)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('Subscription')
      .select('*')
      .eq('id', subscriptionId);

    console.log('[Cancel Subscription] Query result:', { 
      count: subscriptions?.length,
      error: subError,
      searching: subscriptionId,
    });

    if (subError) {
      console.error('[Cancel Subscription] Error en query:', subError);
      return json({ 
        error: 'Error al buscar suscripción',
        details: subError.message,
        debug: {
          subscriptionId,
          userId,
          allUserSubs: allUserSubs?.map(s => s.id),
        }
      }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.error('[Cancel Subscription] No se encontró suscripción con ID:', subscriptionId);
      return json({ 
        error: 'Suscripción no encontrada',
        debug: {
          searchedId: subscriptionId,
          userHasSubs: allUserSubs?.map(s => ({ id: s.id, status: s.status })),
        }
      }, { status: 404 });
    }

    const subscription = subscriptions[0];

    // Verificar que pertenece al usuario
    if (subscription.userId !== userId) {
      console.error('[Cancel Subscription] UserId no coincide:', {
        expected: userId,
        found: subscription.userId,
      });
      return json({ 
        error: 'No autorizado',
      }, { status: 403 });
    }

    console.log('[Cancel Subscription] Subscription found:', subscription.id);

    // Cancelar en Lemon Squeezy
    console.log('[Cancel Subscription] Llamando a Lemon Squeezy API...');
    console.log('[Cancel Subscription] LS Subscription ID:', subscription.lemonsqueezySubscriptionId);
    
    const response = await fetch(
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

    console.log('[Cancel Subscription] LS Response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[Cancel Subscription] Lemon Squeezy error:', error);
      throw new Error('Error al cancelar en Lemon Squeezy: ' + error);
    }

    const result = await response.json();
    console.log('[Cancel Subscription] LS Result:', result.data.attributes);

    // Actualizar en nuestra base de datos (usando admin client)
    console.log('[Cancel Subscription] Actualizando DB...');
    const { error: updateError } = await supabaseAdmin
      .from('Subscription')
      .update({
        status: 'cancelled',
        endsAt: result.data.attributes.ends_at,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[Cancel Subscription] Database update error:', updateError);
      // No fallar si la DB update falla - el webhook lo actualizará
    }

    console.log('[Cancel Subscription] Completado exitosamente');
    return json({ 
      success: true,
      endsAt: result.data.attributes.ends_at,
    });
  } catch (err: any) {
    console.error('[Cancel Subscription] Error:', err);
    return json(
      { error: err?.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
};
