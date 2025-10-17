import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/subscription';

  if (code) {
    const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Usuario confirmó email, redirigir a next (por defecto /subscription)
      throw redirect(303, next);
    }
  }

  // Si hay error, redirigir al login
  throw redirect(303, '/login?error=auth_callback_failed');
};
