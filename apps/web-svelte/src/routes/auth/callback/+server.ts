import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');

  if (code) {
    const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Usuario confirmó email, siempre ir a /subscription
      throw redirect(303, '/subscription');
    }
  }

  // Si hay error, redirigir al login
  throw redirect(303, '/login?error=auth_callback_failed');
};
