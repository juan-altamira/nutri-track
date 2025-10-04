<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  
  let email = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  async function handleResetRequest(e?: Event) {
    if (e) e.preventDefault();
    loading = true;
    error = null;
    success = false;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    loading = false;

    if (resetError) {
      if (resetError.message.toLowerCase().includes('invalid email')) {
        error = 'Correo electrónico inválido';
      } else {
        error = 'Error al enviar el correo. Por favor, intenta nuevamente';
      }
    } else {
      success = true;
    }
  }
</script>

<svelte:head>
  <title>Restablecer Contraseña | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <div class="w-full max-w-md mx-auto">
    <div class="space-y-8">
      <!-- Logo -->
      <div class="flex justify-center">
        <img 
          src="/imagen-para-el-login.png" 
          alt="Nutri-Track Logo" 
          class="w-[250px] h-auto object-contain"
        />
      </div>
      
      <h1 class="text-2xl font-bold text-center">Restablecer Contraseña</h1>

      {#if !success}
        <p class="text-sm text-gray-600 dark:text-gray-400 text-center px-4">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form class="space-y-6" onsubmit={handleResetRequest}>
          {#if error}
            <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p class="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
            </div>
          {/if}

          <div>
            <label class="block text-sm font-medium mb-1" for="email">Correo Electrónico</label>
            <input 
              id="email" 
              type="email" 
              class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" 
              bind:value={email} 
              required 
              placeholder="tu@email.com"
            />
          </div>

          <button 
            type="submit" 
            class="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-2 rounded transition-colors" 
            disabled={loading}
          >
            {#if loading}
              Enviando...
            {:else}
              Enviar Enlace de Restablecimiento
            {/if}
          </button>

          <div class="text-center">
            <a href="/login" class="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Volver al inicio de sesión
            </a>
          </div>
        </form>
      {:else}
        <!-- Mensaje de éxito -->
        <div class="space-y-6">
          <div class="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div class="flex flex-col items-center text-center gap-3">
              <svg class="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="w-full">
                <h3 class="font-semibold text-green-800 dark:text-green-300 mb-2 text-lg">
                  Correo Enviado
                </h3>
                <p class="text-sm text-green-700 dark:text-green-400">
                  Hemos enviado un enlace de restablecimiento a <strong>{email}</strong>. 
                  Por favor, revisa tu bandeja de entrada y haz click en el enlace para continuar.
                </p>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div class="text-center">
              <p class="text-sm text-blue-700 dark:text-blue-300">
                <strong class="block mb-1">¿No recibiste el correo?</strong>
                Revisa tu carpeta de spam o correo no deseado. El enlace expira en 1 hora.
              </p>
            </div>
          </div>

          <div class="text-center">
            <a href="/login" class="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
              Volver al inicio de sesión
            </a>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
