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
  <title>¡Suscripción Exitosa! | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4">
  <div class="max-w-md w-full text-center">
    <div class="text-8xl mb-6">🎉</div>
    <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
      ¡Gracias por suscribirte!
    </h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      Tu suscripción a Nutri-Track Premium se ha activado correctamente.
    </p>
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Serás redirigido al dashboard en <span class="font-bold text-blue-600 dark:text-blue-400">{countdown}</span> segundos...
      </p>
    </div>
    <button
      onclick={() => goto('/dashboard')}
      class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
    >
      Ir al Dashboard Ahora
    </button>
  </div>
</div>
