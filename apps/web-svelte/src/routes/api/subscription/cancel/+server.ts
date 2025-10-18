import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LEMON_SQUEEZY_API_KEY } from '$env/static/private';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

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

    // Buscar la suscripción por ID (que es único)
    const { data: subscriptions, error: subError } = await locals.supabase
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
      console.error('[Cancel Subscription] No se encontró suscripción con ID:', subscriptionId);
      return json({ 
        error: 'Suscripción no encontrada',
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

    // Actualizar en nuestra base de datos
    console.log('[Cancel Subscription] Actualizando DB...');
    const { error: updateError } = await locals.supabase
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
