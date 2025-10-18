import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';
import { browser } from '$app/environment';

/**
 * Verifica que el usuario esté autenticado y tenga una suscripción activa.
 * Redirige a login o subscription si no cumple los requisitos.
 * Debe ser llamado en onMount() de las páginas protegidas.
 * @returns true si el usuario tiene acceso, false si fue redirigido
 */
export async function requireSubscription(): Promise<boolean> {
  if (!browser) return true;

  try {
    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[Auth Guard] Error al obtener sesión:', sessionError);
      window.location.href = '/login';
      return false;
    }
    
    if (!session) {
      console.log('[Auth Guard] No hay sesión, redirigiendo a login');
      window.location.href = '/login';
      return false;
    }

    console.log('[Auth Guard] Usuario autenticado:', session.user.id);

    // Verificar suscripción
    const { data: subscription, error: subError } = await supabase
      .from('Subscription')
      .select('status')
      .eq('userId', session.user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('[Auth Guard] Error al verificar suscripción:', subError);
    }

    if (!subscription || !['active', 'on_trial'].includes(subscription.status)) {
      console.log('[Auth Guard] Sin suscripción válida');
      console.log('[Auth Guard] Status:', subscription?.status);
      window.location.href = '/subscription';
      return false;
    }

    console.log('[Auth Guard] Acceso permitido - Status:', subscription.status);
    return true;
  } catch (error) {
    console.error('[Auth Guard] Error inesperado:', error);
    window.location.href = '/subscription';
    return false;
  }
}
