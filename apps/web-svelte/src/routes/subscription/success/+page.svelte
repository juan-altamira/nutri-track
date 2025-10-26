<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';

  let countdown = $state(30);
  let checking = $state(true);
  let subscriptionFound = $state(false);
  let attempts = $state(0);
  let syncAttempted = $state(false);

  onMount(() => {
    console.log('[Success] Iniciando verificación de suscripción...');
    
    let pollInterval: ReturnType<typeof setInterval>;
    let countdownInterval: ReturnType<typeof setInterval>;
    
    // Función async para manejar la lógica
    (async () => {
      // Obtener sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[Success] No hay sesión, redirigiendo a login');
        goto('/login');
        return;
      }

      const userId = session.user.id;
      console.log('[Success] User ID:', userId);

      // Obtener preapproval_id de la URL (viene de MP)
      const urlParams = new URLSearchParams(window.location.search);
      const preapprovalId = urlParams.get('preapproval_id') || urlParams.get('subscription_id');
      console.log('[Success] Preapproval ID de URL:', preapprovalId);

      // Polling: verificar cada 2 segundos si la suscripción existe
      pollInterval = setInterval(async () => {
        attempts++;
        console.log(`[Success] Intento ${attempts} - Verificando suscripción...`);

        try {
          const { data: sub, error } = await supabase
            .from('Subscription')
            .select('*')
            .eq('userId', userId)
            .single();

          if (sub && !error) {
            console.log('[Success] ¡Suscripción encontrada!', sub);
            subscriptionFound = true;
            checking = false;
            clearInterval(pollInterval);
            clearInterval(countdownInterval);
            
            // Esperar 2 segundos para mostrar mensaje y redirigir
            setTimeout(() => {
              goto('/dashboard');
            }, 2000);
          } else {
            console.log('[Success] Suscripción aún no existe, esperando...');
            
            // FALLBACK: Si después de 5 intentos (10 seg) no hay suscripción,
            // y tenemos preapproval_id, intentar crear vía API
            if (attempts === 5 && preapprovalId && !syncAttempted) {
              syncAttempted = true;
              console.log('[Success] Webhook no procesó, intentando sync manual...');
              
              try {
                const syncResponse = await fetch('/api/subscription/sync-mp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ preapprovalId, userId }),
                });
                
                const syncData = await syncResponse.json();
                
                if (syncData.success) {
                  console.log('[Success] ✅ Sync exitoso!', syncData);
                  // La próxima iteración del polling la encontrará
                } else {
                  console.error('[Success] Error en sync:', syncData);
                }
              } catch (syncErr) {
                console.error('[Success] Error al sincronizar:', syncErr);
              }
            }
          }
        } catch (err) {
          console.error('[Success] Error al verificar suscripción:', err);
        }
      }, 2000); // Verificar cada 2 segundos

      // Countdown timer
      countdownInterval = setInterval(() => {
        countdown--;
        if (countdown === 0) {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          console.log('[Success] Timeout alcanzado, redirigiendo de todas formas...');
          goto('/dashboard');
        }
      }, 1000);
    })();

    // Cleanup
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });
</script>

<svelte:head>
  <title>¡Suscripción Exitosa! | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4">
  <div class="max-w-md w-full text-center">
    <div class="text-8xl mb-6">{subscriptionFound ? '✅' : '🎉'}</div>
    <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
      {subscriptionFound ? '¡Suscripción Activada!' : '¡Gracias por suscribirte!'}
    </h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      {#if subscriptionFound}
        Tu suscripción a Nutri-Track se ha activado correctamente.
      {:else if checking}
        Estamos procesando tu suscripción...
      {:else}
        Tu pago fue procesado exitosamente.
      {/if}
    </p>
    
    {#if checking && !subscriptionFound}
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
        <div class="flex items-center justify-center mb-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Verificando tu suscripción...
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Intento {attempts} de 15 • Máximo {countdown} segundos
        </p>
      </div>
    {:else if subscriptionFound}
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
        <p class="text-sm text-green-700 dark:text-green-300">
          ¡Suscripción confirmada! Redirigiendo...
        </p>
      </div>
    {:else}
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Serás redirigido al dashboard en <span class="font-bold text-blue-600 dark:text-blue-400">{countdown}</span> segundos...
        </p>
      </div>
    {/if}
    
    <button
      onclick={() => goto('/dashboard')}
      class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={checking && !subscriptionFound}
    >
      {subscriptionFound ? 'Ir al Dashboard' : 'Ir al Dashboard Ahora'}
    </button>
    
    {#if checking && !subscriptionFound}
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Estamos esperando la confirmación de Mercado Pago. Esto puede tomar hasta 30 segundos.
      </p>
    {/if}
  </div>
</div>
