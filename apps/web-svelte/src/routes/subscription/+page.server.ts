import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { session } = await locals.safeGetSession();

  if (!session) {
    // Redirigir a login con returnUrl para volver a /subscription después
    throw redirect(303, `/login?returnUrl=${encodeURIComponent(url.pathname)}`);
  }

  return {
    session,
  };
};
