import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();

  // Verificar que el usuario esté autenticado
  if (!session) {
    console.log('[Dashboard] No hay sesión, redirigiendo a login');
    throw redirect(303, '/login?returnUrl=/dashboard');
  }

  console.log('[Dashboard] Usuario autenticado:', session.user.id);

  // Verificar que el usuario tenga una suscripción activa
  const { data: subscription, error } = await locals.supabase
    .from('Subscription')
    .select('status')
    .eq('userId', session.user.id)
    .single();

  console.log('[Dashboard] Suscripción encontrada:', subscription);
  console.log('[Dashboard] Error:', error);

  // Si no tiene suscripción o no está activa/en trial, redirigir a página de suscripción
  if (!subscription || !['active', 'on_trial'].includes(subscription.status)) {
    console.log('[Dashboard] Sin suscripción válida, redirigiendo a /subscription');
    console.log('[Dashboard] Subscription status:', subscription?.status);
    throw redirect(303, '/subscription');
  }

  console.log('[Dashboard] Acceso permitido');

  // Usuario tiene suscripción válida, permitir acceso
  return {
    session,
  };
};
