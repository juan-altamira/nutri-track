import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCheckout } from '$lib/lemonsqueezy';

export const POST: RequestHandler = async ({ locals }) => {
  try {
    console.log('[Checkout] Iniciando...');
    
    // Obtener sesión del usuario
    const { session } = await locals.safeGetSession();
    
    console.log('[Checkout] Session:', session ? 'existe' : 'null');

    if (!session) {
      console.error('[Checkout] No hay sesión válida');
      return json({ error: 'No estás autenticado. Por favor, iniciá sesión.' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = String(session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario');

    if (!userEmail) {
      return json({ error: 'User email not found' }, { status: 400 });
    }

    // Verificar si el usuario ya tiene o tuvo una suscripción (limita trial a una vez)
    const { data: existingSub } = await locals.supabase
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
  } catch (err: any) {
    console.error('[Checkout] Error:', err);
    return json({ 
      error: err?.message || 'Failed to create checkout',
      details: err?.toString(),
    }, { status: 500 });
  }
};
