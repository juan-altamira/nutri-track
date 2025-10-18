<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { toasts } from '$lib/stores/toast';
  import type { PageData } from './$types';

  type Subscription = {
    id: string;
    status: string;
    renewsAt: string | null;
    endsAt: string | null;
    trialEndsAt: string | null;
  };

  let { data }: { data: PageData } = $props();
  
  let subscription = $state<Subscription | null>(null);
  let loading = $state(true);
  let checkoutLoading = $state(false);
  let userId = $state<string | null>(null);

  onMount(async () => {
    try {
      console.log('[Subscription onMount] Iniciando...');
      
      // Timeout de seguridad
      const timeout = setTimeout(() => {
        console.error('[Subscription] Timeout - recargando...');
        loading = false;
        toasts.error('La página tardó demasiado en cargar. Recargá la página.');
      }, 10000); // 10 segundos
      
      // Verificar sesión del lado del cliente (más confiable que SSR)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[Subscription] Session:', session ? 'existe' : 'null');
      console.log('[Subscription] Session error:', sessionError);
      
      if (sessionError) {
        console.error('[Subscription] Error de sesión:', sessionError);
        clearTimeout(timeout);
        toasts.error('Error al verificar sesión. Iniciá sesión nuevamente.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      if (!session) {
        console.log('[Subscription] No hay sesión, redirigiendo a login');
        clearTimeout(timeout);
        window.location.href = '/login?returnUrl=/subscription';
        return;
      }
      
      userId = session.user.id;
      console.log('[Subscription] User ID:', userId);
      
      await loadSubscription();
      clearTimeout(timeout);
    } catch (error) {
      console.error('[Subscription onMount] Error inesperado:', error);
      loading = false;
      toasts.error('Error al cargar la página. Por favor, recargá.');
    }
  });

  async function loadSubscription() {
    try {
      loading = true;
      console.log('[Subscription] Cargando suscripción para userId:', userId);
      
      const { data: subData, error } = await supabase
        .from('Subscription')
        .select('*')
        .eq('userId', userId)
        .single();

      console.log('[Subscription] Query result:', { subData, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[Subscription] Error en query:', error);
        throw error;
      }

      subscription = subData;
      console.log('[Subscription] Subscription loaded:', subscription ? 'existe' : 'null');
    } catch (err: any) {
      console.error('[Subscription] Load error:', err);
      toasts.error('Error al cargar suscripción');
    } finally {
      loading = false;
      console.log('[Subscription] Loading complete');
    }
  }

  async function handleSubscribe() {
    try {
      checkoutLoading = true;

      // Obtener el access token del cliente
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa. Por favor, recargá la página.');
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al crear checkout');
      }

      // Redirigir al checkout de Lemon Squeezy
      window.location.href = responseData.checkoutUrl;
    } catch (err: any) {
      console.error('[Subscription] Subscribe error:', err);
      toasts.error(err.message || 'Error al iniciar suscripción');
      checkoutLoading = false;
    }
  }

  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'Activa',
      on_trial: 'En período de prueba',
      cancelled: 'Cancelada',
      expired: 'Expirada',
      past_due: 'Pago pendiente',
      paused: 'Pausada',
    };
    return statusMap[status] || status;
  }

  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      active: 'text-green-600 dark:text-green-400',
      on_trial: 'text-blue-600 dark:text-blue-400',
      cancelled: 'text-red-600 dark:text-red-400',
      expired: 'text-gray-600 dark:text-gray-400',
      past_due: 'text-orange-600 dark:text-orange-400',
      paused: 'text-yellow-600 dark:text-yellow-400',
    };
    return colorMap[status] || 'text-gray-600';
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
</script>

<svelte:head>
  <title>Suscripción | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen p-4 max-w-2xl mx-auto">
  {#if subscription && ['active', 'on_trial'].includes(subscription.status)}
    <div class="mb-6">
      <a href="/dashboard" class="text-blue-600 dark:text-blue-400 hover:underline">
        ← Volver al dashboard
      </a>
    </div>
  {:else if !loading}
    <div class="mb-6">
      <a href="/logout" class="text-gray-600 dark:text-gray-400 hover:underline">
        ← Cerrar sesión
      </a>
    </div>
  {/if}

  <h1 class="text-3xl font-bold mb-6">Mi Suscripción</h1>

  {#if loading}
    <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center space-y-4">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-gray-600 dark:text-gray-400">Cargando información de tu suscripción...</p>
      <div class="pt-4 text-sm text-gray-500 dark:text-gray-500">
        <p>¿Tarda demasiado?</p>
        <div class="flex gap-4 justify-center mt-2">
          <button onclick={() => window.location.reload()} class="text-blue-600 hover:underline">
            Recargar página
          </button>
          <a href="/logout" class="text-gray-600 hover:underline">
            Cerrar sesión
          </a>
        </div>
      </div>
    </div>
  {:else if subscription}
    <!-- Usuario tiene suscripción -->
    <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-4">
      <div>
        <h2 class="text-xl font-semibold mb-2">Nutri-Track Premium</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Acceso completo a todas las funcionalidades
        </p>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Estado</p>
            <p class="font-semibold {getStatusColor(subscription.status)}">
              {getStatusText(subscription.status)}
            </p>
          </div>

          {#if subscription.trialEndsAt && subscription.status === 'on_trial'}
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Prueba finaliza</p>
              <p class="font-semibold">{formatDate(subscription.trialEndsAt)}</p>
            </div>
          {/if}

          {#if subscription.renewsAt && ['active', 'on_trial'].includes(subscription.status)}
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Próxima renovación</p>
              <p class="font-semibold">{formatDate(subscription.renewsAt)}</p>
            </div>
          {/if}

          {#if subscription.endsAt && ['cancelled', 'expired'].includes(subscription.status)}
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Finaliza</p>
              <p class="font-semibold">{formatDate(subscription.endsAt)}</p>
            </div>
          {/if}
        </div>
      </div>

      {#if subscription.status === 'past_due'}
        <div class="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
          <p class="text-sm text-orange-800 dark:text-orange-200">
            Hay un problema con tu pago. Por favor, actualiza tu método de pago para continuar con tu suscripción.
          </p>
        </div>
      {/if}

      <div class="pt-4 space-y-3">
        {#if ['active', 'on_trial'].includes(subscription.status)}
          <!-- Suscripción activa: gestionar en Lemon Squeezy -->
          {#if (subscription as any).updatePaymentMethodUrl}
            <a
              href={(subscription as any).updatePaymentMethodUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              Gestionar suscripción →
            </a>
          {/if}
        {:else if ['cancelled', 'expired'].includes(subscription.status)}
          <!-- Suscripción cancelada/expirada: crear nueva -->
          <button
            onclick={handleSubscribe}
            disabled={checkoutLoading}
            class="inline-block px-6 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {checkoutLoading ? 'Cargando...' : 'Reactivar Suscripción →'}
          </button>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Nota: La prueba gratuita solo está disponible una vez. Tu nueva suscripción comenzará inmediatamente.
          </p>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Usuario NO tiene suscripción -->
    <!-- Mensaje de advertencia -->
    <div class="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div>
          <p class="font-semibold text-amber-900 dark:text-amber-100 mb-1">
            Suscripción requerida
          </p>
          <p class="text-sm text-amber-800 dark:text-amber-200">
            Para acceder al dashboard y todas las funcionalidades de Nutri-Track, necesitás activar una suscripción.
          </p>
        </div>
      </div>
    </div>

    <div class="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-6">
      <div>
        <h2 class="text-2xl font-bold mb-2">Nutri-Track Premium</h2>
        <p class="text-gray-600 dark:text-gray-400">
          Acceso completo a todas las funcionalidades de seguimiento nutricional
        </p>
      </div>

      <div class="space-y-3">
        <h3 class="font-semibold text-lg">Incluye:</h3>
        <ul class="space-y-2">
          <li class="flex items-start gap-2">
            <span class="text-green-600 dark:text-green-400">✓</span>
            <span>Seguimiento detallado de macronutrientes</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-green-600 dark:text-green-400">✓</span>
            <span>Análisis completo de vitaminas y minerales</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-green-600 dark:text-green-400">✓</span>
            <span>Base de datos extensa de alimentos</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-green-600 dark:text-green-400">✓</span>
            <span>Creación de alimentos personalizados</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-green-600 dark:text-green-400">✓</span>
            <span>Gestión de múltiples perfiles</span>
          </li>
        </ul>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div class="mb-4">
          <p class="text-3xl font-bold mb-1">USD 9,90/mes</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            14 días de prueba gratuita · Cancela cuando quieras
          </p>
        </div>

        <button
          onclick={handleSubscribe}
          disabled={checkoutLoading}
          class="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {checkoutLoading ? 'Redirigiendo...' : 'Comenzar prueba gratuita'}
        </button>
      </div>
    </div>
  {/if}
</div>
