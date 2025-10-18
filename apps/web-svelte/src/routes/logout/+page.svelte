<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let status = $state<'loading' | 'success' | 'error'>('loading');

  onMount(async () => {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // Limpiar localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      
      // Limpiar sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      status = 'success';
      
      // Redirigir al login después de 1 segundo
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('[Logout] Error:', error);
      status = 'error';
      
      // Incluso con error, intentar redirigir
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  });
</script>

<svelte:head>
  <title>Cerrando Sesión | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors px-4">
  <div class="text-center">
    {#if status === 'loading'}
      <div class="text-6xl mb-4">⏳</div>
      <h1 class="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Cerrando sesión...</h1>
      <p class="text-gray-600 dark:text-gray-400">Un momento por favor</p>
    {:else if status === 'success'}
      <div class="text-6xl mb-4">✅</div>
      <h1 class="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Sesión cerrada</h1>
      <p class="text-gray-600 dark:text-gray-400">Redirigiendo al login...</p>
    {:else}
      <div class="text-6xl mb-4">❌</div>
      <h1 class="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Error al cerrar sesión</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Redirigiendo de todas formas...</p>
      <a href="/login" class="text-blue-600 hover:underline dark:text-blue-400">
        Ir al login ahora
      </a>
    {/if}
  </div>
</div>
