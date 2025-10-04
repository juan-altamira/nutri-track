<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let email = '';
  let password = '';
  let loading = false;
  let error: string | null = null;

  onMount(async () => {
    // Si ya hay sesión, redirige directo al dashboard
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      goto('/dashboard');
    }
  });

  async function handleSubmit(e?: Event) {
    if (e) e.preventDefault();
    loading = true;
    error = null;
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    loading = false;
    if (authError) {
      error = authError.message;
    } else {
      goto('/dashboard');
    }
  }
</script>

<svelte:head>
  <title>Iniciar Sesión | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-start justify-center px-4 pt-16 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <form class="w-full max-w-sm space-y-6" on:submit={handleSubmit}>
    <!-- Logo -->
    <div class="flex justify-center mb-6">
      <img 
        src="/imagen-para-el-login.png" 
        alt="Nutri-Track Logo" 
        class="w-[250px] h-auto object-contain"
      />
    </div>
    
    <h1 class="text-2xl font-bold text-center">Iniciar Sesión</h1>

    {#if error}
      <p class="text-red-600 text-sm">{error}</p>
    {/if}

    <div>
      <label class="block text-sm font-medium mb-1" for="email">Correo Electrónico</label>
      <input id="email" type="email" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={email} required />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="password">Contraseña</label>
      <input id="password" type="password" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={password} required />
    </div>

    <button type="submit" class="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded" disabled={loading}>
      {#if loading}
        Cargando…
      {:else}
        Iniciar Sesión
      {/if}
    </button>

    <p class="text-center text-sm text-gray-500">
      ¿No tienes una cuenta?
      <a href="/signup" class="text-blue-600 hover:underline">Registrarse</a>
    </p>
  </form>
</div>
