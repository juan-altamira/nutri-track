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
  <title>Login | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <form class="w-full max-w-sm space-y-4" on:submit={handleSubmit}>
    <h1 class="text-2xl font-bold text-center">Login</h1>

    {#if error}
      <p class="text-red-600 text-sm">{error}</p>
    {/if}

    <div>
      <label class="block text-sm font-medium mb-1" for="email">Email</label>
      <input id="email" type="email" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={email} required />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="password">Password</label>
      <input id="password" type="password" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={password} required />
    </div>

    <button type="submit" class="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded" disabled={loading}>
      {#if loading}
        Loading…
      {:else}
        Sign in
      {/if}
    </button>

    <p class="text-center text-sm text-gray-500">
      Don't have an account?
      <a href="/signup" class="text-blue-600 hover:underline">Sign up</a>
    </p>
  </form>
</div>
