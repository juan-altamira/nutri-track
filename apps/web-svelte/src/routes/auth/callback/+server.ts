import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  // Si viene de confirmación de email (sin code pero con token_hash)
  if (token_hash && type === 'signup') {
    const { error } = await locals.supabase.auth.verifyOtp({
      token_hash,
      type: 'signup',
    });

    if (!error) {
      // Marcar como usuario recién confirmado
      cookies.set('new_user', 'true', { 
        path: '/', 
        maxAge: 60 * 5, // 5 minutos
        httpOnly: true,
        sameSite: 'lax',
      });
      throw redirect(303, '/subscription');
    }
  }

  // Si viene con code (OAuth o magic link)
  if (code) {
    const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      const next = url.searchParams.get('next') || '/subscription';
      throw redirect(303, next);
    }
  }

  // Si hay error, redirigir al login
  throw redirect(303, '/login?error=auth_callback_failed');
};
