import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';

/**
 * Verifica que el usuario esté autenticado y tenga una suscripción activa.
 * Redirige a login o subscription si no cumple los requisitos.
 * @returns true si el usuario tiene acceso, false si fue redirigido
 */
export async function requireSubscription(): Promise<boolean> {
  // Verificar sesión
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('[Auth Guard] No hay sesión, redirigiendo a login');
    goto('/login');
    return false;
  }

  // Verificar suscripción
  const { data: subscription } = await supabase
    .from('Subscription')
    .select('status')
    .eq('userId', session.user.id)
    .single();

  if (!subscription || !['active', 'on_trial'].includes(subscription.status)) {
    console.log('[Auth Guard] Sin suscripción válida, redirigiendo a /subscription');
    goto('/subscription');
    return false;
  }

  console.log('[Auth Guard] Acceso permitido');
  return true;
}
