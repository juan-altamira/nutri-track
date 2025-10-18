import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();

  // Verificar que el usuario esté autenticado
  if (!session) {
    throw redirect(303, '/login?returnUrl=/profiles');
  }

  // Verificar que el usuario tenga una suscripción activa
  const { data: subscription } = await locals.supabase
    .from('Subscription')
    .select('status')
    .eq('userId', session.user.id)
    .single();

  // Si no tiene suscripción o no está activa/en trial, redirigir a página de suscripción
  if (!subscription || !['active', 'on_trial'].includes(subscription.status)) {
    throw redirect(303, '/subscription');
  }

  return {
    session,
  };
};
