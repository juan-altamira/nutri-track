<script lang="ts">
  import { goto } from '$app/navigation';
  import { toasts } from '$lib/stores/toast';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let canceling = $state(false);
  let loading = $state(true);
  let subscription = $state<any>(null);
  let userId = $state<string | null>(null);

  onMount(async () => {
    // Verificar sesión del lado del cliente
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('[Subscription] Session:', session ? 'existe' : 'null');
    
    if (!session) {
      goto('/login?returnUrl=/subscription/manage');
      return;
    }

    userId = session.user.id;
    console.log('[Subscription] User ID:', userId);

    // Cargar suscripción
    try {
      const { data: subData, error } = await supabase
        .from('Subscription')
        .select('*')
        .eq('userId', userId)
        .single();

      console.log('[Subscription] Query result:', { subData, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[Subscription] Error:', error);
        throw error;
      }

      subscription = subData;
      console.log('[Subscription] Final subscription:', subscription);
    } catch (err: any) {
      console.error('[Subscription] Load error:', err);
      toasts.error('Error al cargar suscripción');
    } finally {
      loading = false;
    }
  });

  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'Activa',
      on_trial: 'Prueba Gratuita',
      past_due: 'Pago Pendiente',
      cancelled: 'Cancelada',
      expired: 'Expirada',
      paused: 'Pausada',
      unpaid: 'Impaga',
    };
    return statusMap[status] || status;
  }

  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      on_trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      unpaid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function getDaysRemaining(dateStr: string | null): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  async function handleCancelSubscription() {
    if (!subscription || !userId) {
      console.error('[Cancel] Faltan datos:', { subscription, userId });
      toasts.error('Faltan datos para cancelar. Recargá la página.');
      return;
    }

    console.log('[Cancel] Datos completos:', {
      subscriptionId: subscription.id,
      userId: userId,
      subscription: subscription,
    });

    const confirmed = confirm(
      '¿Estás seguro que deseas cancelar tu suscripción? Perderás acceso a todas las funcionalidades al finalizar el período actual.'
    );

    if (!confirmed) return;

    try {
      canceling = true;
      console.log('[Cancel] Enviando request con:', { 
        subscriptionId: subscription.id,
        userId: userId,
      });
      
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscriptionId: subscription.id,
          userId: userId,
        }),
      });

      const result = await response.json();
      console.log('[Cancel] Response:', result);
      
      if (result.debug) {
        console.log('[Cancel] DEBUG INFO:', result.debug);
      }

      if (!response.ok) {
        const errorMsg = result.error || 'Error al cancelar suscripción';
        console.error('[Cancel] Error completo:', { error: errorMsg, debug: result.debug });
        throw new Error(errorMsg);
      }

      toasts.success('Suscripción cancelada correctamente');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error('[Cancel] Error:', err);
      toasts.error(err.message || 'Error al cancelar suscripción');
      canceling = false;
    }
  }

  function handleManagePayment() {
    const url = (subscription as any)?.updatePaymentMethodUrl;
    if (!url) {
      toasts.error('No se encontró URL de gestión de pago');
      return;
    }
    window.open(url, '_blank');
  }
</script>

<svelte:head>
  <title>Mi Suscripción | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 transition-colors py-8 px-4">
  <div class="max-w-2xl mx-auto">
    <div class="mb-6">
      <a 
        href="/dashboard" 
        class="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-2"
      >
        ← Volver al dashboard
      </a>
    </div>

    <h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Mi Suscripción</h1>

    {#if loading}
      <!-- Cargando -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div class="text-4xl mb-4">⏳</div>
        <p class="text-gray-600 dark:text-gray-400">Cargando suscripción...</p>
      </div>
    {:else if !subscription}
      <!-- Usuario sin suscripción -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div class="text-6xl mb-4">📦</div>
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">No tienes una suscripción activa</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Suscríbete a Nutri-Track para acceder a todas las funcionalidades.
        </p>
        <button
          onclick={() => goto('/subscription')}
          class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Ver Planes de Suscripción
        </button>
      </div>
    {:else}
      <!-- Usuario con suscripción -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <!-- Estado -->
        <div class="mb-6">
          <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Estado</h2>
          <span class={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
            {getStatusText(subscription.status)}
          </span>
        </div>

        <!-- Información de fechas -->
        <div class="space-y-4 mb-8">
          {#if subscription.status === 'on_trial' && subscription.trialEndsAt}
            <div class="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/20">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Prueba Gratuita</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Finaliza el {formatDate(subscription.trialEndsAt)}
              </p>
              <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {getDaysRemaining(subscription.trialEndsAt)} días restantes
              </p>
            </div>
          {/if}

          {#if subscription.status === 'active' && subscription.renewsAt}
            <div class="border-l-4 border-green-500 pl-4 py-2 bg-green-50 dark:bg-green-900/20">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Próxima Renovación</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(subscription.renewsAt)}
              </p>
            </div>
          {/if}

          {#if subscription.status === 'cancelled' && subscription.endsAt}
            <div class="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-900/20">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Acceso hasta</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(subscription.endsAt)}
              </p>
            </div>
          {/if}
        </div>

        <!-- Acciones -->
        <div class="space-y-3">
          {#if ['active', 'on_trial'].includes(subscription.status)}
            {#if (subscription as any).updatePaymentMethodUrl}
              <button
                onclick={handleManagePayment}
                class="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Actualizar Método de Pago
              </button>
            {/if}

            <button
              onclick={handleCancelSubscription}
              disabled={canceling}
              class="w-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canceling ? 'Cancelando...' : 'Cancelar Suscripción'}
            </button>
          {/if}

          {#if subscription.status === 'cancelled' || subscription.status === 'expired'}
            <button
              onclick={() => goto('/subscription')}
              class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              Reactivar Suscripción
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
