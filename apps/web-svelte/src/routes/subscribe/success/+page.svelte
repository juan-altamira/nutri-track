<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let countdown = $state(5);

  onMount(() => {
    const interval = setInterval(() => {
      countdown--;
      if (countdown === 0) {
        goto('/dashboard');
      }
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Suscripción Exitosa | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <div class="w-full max-w-md mx-auto text-center space-y-8">
    <!-- Icono de éxito -->
    <div class="flex justify-center">
      <div class="rounded-full bg-green-100 dark:bg-green-900/30 p-6">
        <svg class="w-20 h-20 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
    </div>

    <!-- Mensaje -->
    <div class="space-y-4">
      <h1 class="text-3xl font-bold text-green-600 dark:text-green-400">
        ¡Suscripción Exitosa!
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Tu período de prueba de 14 días ha comenzado.
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500">
        Redirigiendo al dashboard en {countdown} segundos...
      </p>
    </div>

    <!-- Botón manual -->
    <button
      onclick={() => goto('/dashboard')}
      class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
    >
      Ir al Dashboard Ahora
    </button>
  </div>
</div>
