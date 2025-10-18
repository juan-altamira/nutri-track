import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }: any) => {
  const { session } = await locals.safeGetSession();

  if (!session) {
    throw redirect(303, '/login?returnUrl=/profiles');
  }

  const { data: subscription } = await locals.supabase
    .from('Subscription')
    .select('status')
    .eq('userId', session.user.id)
    .single();

  if (!subscription || !['active', 'on_trial'].includes(subscription.status)) {
    throw redirect(303, '/subscription');
  }

  return { session };
};
