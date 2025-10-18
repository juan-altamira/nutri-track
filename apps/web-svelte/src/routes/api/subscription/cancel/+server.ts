import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LEMON_SQUEEZY_API_KEY } from '$env/static/private';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { session } = await locals.safeGetSession();

    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return json({ error: 'Subscription ID required' }, { status: 400 });
    }

    // Verificar que la suscripción pertenece al usuario
    const { data: subscription, error: subError } = await locals.supabase
      .from('Subscription')
      .select('*')
      .eq('id', subscriptionId)
      .eq('userId', session.user.id)
      .single();

    if (subError || !subscription) {
      return json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Cancelar en Lemon Squeezy
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

    if (!response.ok) {
      const error = await response.text();
      console.error('[Cancel Subscription] Lemon Squeezy error:', error);
      throw new Error('Failed to cancel subscription in Lemon Squeezy');
    }

    const result = await response.json();

    // Actualizar en nuestra base de datos
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
    }

    return json({ success: true });
  } catch (err: any) {
    console.error('[Cancel Subscription] Error:', err);
    return json(
      { error: err?.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
};
