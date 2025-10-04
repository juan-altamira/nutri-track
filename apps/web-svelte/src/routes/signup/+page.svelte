<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let showPassword = $state(false);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) goto('/dashboard');
  });

  async function handleSubmit(e?: Event) {
    if (e) e.preventDefault();
    loading = true;
    error = null;
    message = null;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    loading = false;
    if (signUpError) {
      // Log del error real para debugging (quitar en producción)
      console.error('[Signup Error]:', signUpError.message);
      
      // Traducir mensajes de error al español
      if (signUpError.message.toLowerCase().includes('user already registered')) {
        error = 'Este correo electrónico ya está registrado';
      } else if (signUpError.message.toLowerCase().includes('password should be at least')) {
        error = 'La contraseña debe tener al menos 6 caracteres';
      } else if (signUpError.message.toLowerCase().includes('invalid email')) {
        error = 'Correo electrónico inválido';
      } else if (signUpError.message.toLowerCase().includes('email rate limit')) {
        error = 'Demasiados intentos. Espera unos minutos e intenta nuevamente';
      } else {
        // Mostrar el mensaje de Supabase en desarrollo
        error = import.meta.env.DEV 
          ? `Error: ${signUpError.message}` 
          : 'Error al crear la cuenta. Por favor, intenta nuevamente';
      }
      return;
    }

    if (data.user && !data.session) {
      message = 'Revisa tu correo electrónico para confirmar tu cuenta, luego inicia sesión.';
    } else {
      goto('/dashboard');
    }
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }
</script>

<svelte:head>
  <title>Registro | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-start justify-center px-4 pt-16 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <form class="w-full max-w-sm space-y-6" onsubmit={handleSubmit}>
    <!-- Logo -->
    <div class="flex justify-center mb-6">
      <img 
        src="/imagen-para-el-login.png" 
        alt="Nutri-Track Logo" 
        class="w-[250px] h-auto object-contain"
      />
    </div>
    
    <h1 class="text-2xl font-bold text-center">Crear Cuenta</h1>

    {#if error}
      <p class="text-red-600 text-sm">{error}</p>
    {/if}
    {#if message}
      <p class="text-gray-500 text-sm">{message}</p>
    {/if}

    <div>
      <label class="block text-sm font-medium mb-1" for="email">Correo Electrónico</label>
      <input id="email" type="email" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={email} required />
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="password">Contraseña</label>
      <div class="relative">
        <input 
          id="password" 
          type={showPassword ? 'text' : 'password'}
          class="w-full border rounded px-3 py-2 pr-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" 
          bind:value={password} 
          required 
        />
        <button
          type="button"
          onclick={togglePasswordVisibility}
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {#if showPassword}
            <!-- Icono de ojo cerrado -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
            </svg>
          {:else}
            <!-- Icono de ojo abierto -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <button type="submit" class="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 rounded" disabled={loading}>
      {#if loading}
        Creando cuenta…
      {:else}
        Registrarse
      {/if}
    </button>

    <p class="text-center text-sm text-gray-500">
      ¿Ya tienes una cuenta?
      <a href="/login" class="text-blue-600 hover:underline">Iniciar sesión</a>
    </p>
  </form>
</div>
