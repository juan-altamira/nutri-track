<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let password = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let validSession = $state(false);

  onMount(async () => {
    // Verificar si hay una sesión de recuperación
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      validSession = true;
    } else {
      error = 'Enlace inválido o expirado. Por favor, solicita un nuevo enlace de restablecimiento.';
    }
  });

  async function handleUpdatePassword(e?: Event) {
    if (e) e.preventDefault();
    
    // Validaciones
    if (password.length < 6) {
      error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Las contraseñas no coinciden';
      return;
    }

    loading = true;
    error = null;

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    loading = false;

    if (updateError) {
      error = 'Error al actualizar la contraseña. Por favor, intenta nuevamente';
    } else {
      // Redirigir al dashboard después de actualizar
      goto('/dashboard');
    }
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
  }
</script>

<svelte:head>
  <title>Actualizar Contraseña | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-start justify-center px-4 pt-16 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <div class="w-full max-w-sm space-y-6">
    <!-- Logo -->
    <div class="flex justify-center mb-6">
      <img 
        src="/imagen-para-el-login.png" 
        alt="Nutri-Track Logo" 
        class="w-[250px] h-auto object-contain"
      />
    </div>
    
    <h1 class="text-2xl font-bold text-center">Nueva Contraseña</h1>

    {#if validSession}
      <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
        Ingresa tu nueva contraseña
      </p>

      <form class="space-y-6" onsubmit={handleUpdatePassword}>
        {#if error}
          <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        {/if}

        <div>
          <label class="block text-sm font-medium mb-1" for="password">Nueva Contraseña</label>
          <div class="relative">
            <input 
              id="password" 
              type={showPassword ? 'text' : 'password'}
              class="w-full border rounded px-3 py-2 pr-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" 
              bind:value={password} 
              required 
              minlength="6"
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onclick={togglePasswordVisibility}
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {#if showPassword}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                </svg>
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1" for="confirmPassword">Confirmar Contraseña</label>
          <div class="relative">
            <input 
              id="confirmPassword" 
              type={showConfirmPassword ? 'text' : 'password'}
              class="w-full border rounded px-3 py-2 pr-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" 
              bind:value={confirmPassword} 
              required 
              minlength="6"
              placeholder="Repite tu contraseña"
            />
            <button
              type="button"
              onclick={toggleConfirmPasswordVisibility}
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {#if showConfirmPassword}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                </svg>
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          class="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-2 rounded transition-colors" 
          disabled={loading}
        >
          {#if loading}
            Actualizando...
          {:else}
            Actualizar Contraseña
          {/if}
        </button>
      </form>
    {:else}
      <!-- Enlace inválido o expirado -->
      <div class="space-y-4">
        <div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="flex-1">
              <h3 class="font-semibold text-red-800 dark:text-red-300 mb-1">
                Enlace Inválido
              </h3>
              <p class="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>

        <div class="text-center space-y-2">
          <a 
            href="/reset-password" 
            class="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            Solicitar Nuevo Enlace
          </a>
          <a href="/login" class="block text-sm text-blue-600 hover:underline dark:text-blue-400">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
