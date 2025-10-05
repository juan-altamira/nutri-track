<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let loading = $state(false);
  let error = $state<string | null>(null);
  let userEmail = $state('');

  onMount(async () => {
    // Verificar si el usuario está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      goto('/login');
      return;
    }

    userEmail = session.user.email || '';

    // Verificar si ya tiene una suscripción activa
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .in('status', ['on_trial', 'active'])
      .single();

    if (subscription) {
      // Ya tiene suscripción, redirigir al dashboard
      goto('/dashboard');
    }
  });

  async function handleSubscribe() {
    loading = true;
    error = null;

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!response.ok) {
        throw new Error('Error al crear checkout');
      }

      const { checkoutUrl } = await response.json();
      
      // Redirigir a Lemon Squeezy checkout
      window.location.href = checkoutUrl;

    } catch (err) {
      console.error('[Subscribe Error]:', err);
      error = 'Error al procesar la suscripción. Por favor, intenta nuevamente.';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Suscribirse | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <div class="w-full max-w-2xl mx-auto">
    <div class="space-y-8">
      <!-- Logo -->
      <div class="flex justify-center">
        <img 
          src="/imagen-para-el-login.png" 
          alt="Nutri-Track Logo" 
          class="w-[250px] h-auto object-contain"
        />
      </div>

      <!-- Título -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold">¡Bienvenido a Nutri-Track!</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Comienza tu viaje hacia una mejor nutrición
        </p>
      </div>

      <!-- Plan de suscripción -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border-2 border-blue-200 dark:border-blue-800">
        <div class="text-center space-y-6">
          <div>
            <h2 class="text-2xl font-bold text-blue-900 dark:text-blue-100">Plan Mensual</h2>
            <div class="mt-4">
              <span class="text-5xl font-bold text-blue-600 dark:text-blue-400">$9.900</span>
              <span class="text-xl text-gray-600 dark:text-gray-400"> ARS/mes</span>
            </div>
          </div>

          <!-- Características -->
          <div class="space-y-3 text-left max-w-md mx-auto">
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700 dark:text-gray-300">
                <strong>14 días de prueba gratuita</strong> - Cancela cuando quieras
              </span>
            </div>
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700 dark:text-gray-300">
                Seguimiento completo de macronutrientes y micronutrientes
              </span>
            </div>
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700 dark:text-gray-300">
                Base de datos de alimentos + alimentos personalizados
              </span>
            </div>
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700 dark:text-gray-300">
                Múltiples perfiles con RDA personalizado
              </span>
            </div>
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-gray-700 dark:text-gray-300">
                Gráficos y estadísticas detalladas
              </span>
            </div>
          </div>

          <!-- Mensaje de error -->
          {#if error}
            <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p class="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
            </div>
          {/if}

          <!-- Botón de suscripción -->
          <button
            onclick={handleSubscribe}
            disabled={loading}
            class="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {#if loading}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            {:else}
              Comenzar Prueba Gratuita de 14 Días
            {/if}
          </button>

          <p class="text-sm text-gray-500 dark:text-gray-400">
            No se te cobrará hasta que termine tu período de prueba.<br />
            Puedes cancelar en cualquier momento.
          </p>
        </div>
      </div>

      <!-- Link para saltar (temporal, para testing) -->
      <div class="text-center">
        <a href="/dashboard" class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          Saltar por ahora (solo para testing)
        </a>
      </div>
    </div>
  </div>
</div>
