<script lang="ts">
  import { onMount } from 'svelte';
  
  let deferredPrompt: any = null;
  let showInstallButton = $state(false);
  let isInstalling = $state(false);
  let showBanner = $state(true);

  onMount(() => {
    // Detectar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] App ya está instalada');
      return;
    }

    // Escuchar el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] beforeinstallprompt disparado');
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton = true;
    });

    // Escuchar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalada exitosamente');
      showInstallButton = false;
      deferredPrompt = null;
    });

    // Registrar el Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Error registrando Service Worker:', error);
        });
    }
  });

  async function handleInstallClick() {
    if (!deferredPrompt) {
      console.warn('[PWA] No hay prompt de instalación disponible');
      return;
    }

    isInstalling = true;

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Usuario respondió: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('[PWA] Usuario aceptó instalar');
    } else {
      console.log('[PWA] Usuario rechazó instalar');
    }

    deferredPrompt = null;
    showInstallButton = false;
    isInstalling = false;
  }

  function dismissBanner() {
    showBanner = false;
    // Guardar en localStorage que el usuario cerró el banner
    try {
      localStorage.setItem('pwa-banner-dismissed', 'true');
    } catch (e) {
      console.error('[PWA] Error guardando preferencia:', e);
    }
  }

  onMount(() => {
    // Verificar si el usuario ya cerró el banner antes
    try {
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (dismissed === 'true') {
        showBanner = false;
      }
    } catch (e) {
      // Si hay error accediendo a localStorage, mostrar el banner de todas formas
    }
  });
</script>

{#if showInstallButton && showBanner}
  <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
    <div class="max-w-screen-lg mx-auto flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1">
        <div class="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Instalar Nutri-Track
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Accede más rápido y úsala offline
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          onclick={dismissBanner}
          class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          aria-label="Cerrar"
        >
          Ahora no
        </button>
        <button
          onclick={handleInstallClick}
          disabled={isInstalling}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if isInstalling}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Instalando...
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Instalar
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
