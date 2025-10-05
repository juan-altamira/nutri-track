<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Suscripción Cancelada | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <div class="w-full max-w-md mx-auto text-center space-y-8">
    <!-- Icono -->
    <div class="flex justify-center">
      <div class="rounded-full bg-gray-100 dark:bg-gray-800 p-6">
        <svg class="w-20 h-20 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
    </div>

    <!-- Mensaje -->
    <div class="space-y-4">
      <h1 class="text-3xl font-bold">
        Suscripción Cancelada
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        No te preocupes, puedes suscribirte cuando quieras.
      </p>
    </div>

    <!-- Botones -->
    <div class="space-y-3">
      <button
        onclick={() => goto('/subscribe')}
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Intentar Nuevamente
      </button>
      <button
        onclick={() => goto('/dashboard')}
        class="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Volver al Dashboard
      </button>
    </div>
  </div>
</div>
