import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCheckout } from '$lib/lemonsqueezy';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Crear cliente de Supabase con el token de sesión
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });

    // Verificar que el usuario esté autenticado
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.user_metadata?.name || '';

    if (!userEmail) {
      return json({ error: 'User email not found' }, { status: 400 });
    }

    // Verificar si el usuario ya tiene o tuvo una suscripción (limita trial a una vez)
    const { data: existingSub } = await supabase
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .single();

    if (existingSub) {
      // Si ya tiene una suscripción activa o en trial
      if (['active', 'on_trial'].includes(existingSub.status)) {
        return json({ error: 'Ya tenés una suscripción activa' }, { status: 400 });
      }
      // Si ya usó el trial antes, puede suscribirse sin trial
      // Esto lo maneja Lemon Squeezy automáticamente por email
    }

    // Crear checkout en Lemon Squeezy
    const checkoutUrl = await createCheckout({
      userId,
      userEmail,
      userName,
    });

    return json({ checkoutUrl });
  } catch (err) {
    console.error('[Checkout] Error:', err);
    return json({ error: 'Failed to create checkout' }, { status: 500 });
  }
};
