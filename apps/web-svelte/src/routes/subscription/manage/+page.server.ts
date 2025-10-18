import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();

  if (!session) {
    throw redirect(303, '/login?returnUrl=/subscription/manage');
  }

  // Obtener suscripción del usuario
  const { data: subscription, error } = await locals.supabase
    .from('Subscription')
    .select('*')
    .eq('userId', session.user.id)
    .single();

  return {
    session,
    subscription,
  };
};
