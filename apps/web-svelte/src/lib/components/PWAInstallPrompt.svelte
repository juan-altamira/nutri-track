<script lang="ts">
  import { onMount } from 'svelte';
  
  let deferredPrompt = $state<any>(null);
  let showInstallButton = $state(false);
  let isInstalling = $state(false);
  let showBanner = $state(true);
  let debugInfo = $state('');

  // Modo de prueba: cambiar a true para ver el banner siempre (desarrollo)
  // En producción, esto debe ser false para que solo se muestre cuando el navegador lo permita
  const DEBUG_MODE = import.meta.env.DEV; // true en desarrollo, false en producción

  onMount(() => {
    console.log('[PWA] Iniciando componente de instalación...');
    
    // Detectar si la app ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    if (isStandalone || isIOSStandalone) {
      console.log('[PWA] ✅ App ya está instalada');
      debugInfo = 'App instalada';
      if (!DEBUG_MODE) return;
    }

    // Verificar soporte de Service Worker
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] ⚠️ Service Worker no soportado');
      debugInfo = 'Service Worker no soportado';
    }

    // Verificar si el evento beforeinstallprompt es soportado
    let beforeinstallpromptSupported = false;
    
    // Escuchar el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] ✅ beforeinstallprompt disparado');
      beforeinstallpromptSupported = true;
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton = true;
      debugInfo = 'Evento de instalación capturado';
    });

    // Escuchar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] ✅ App instalada exitosamente');
      showInstallButton = false;
      deferredPrompt = null;
      debugInfo = 'App instalada con éxito';
    });

    // Registrar el Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ✅ Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('[PWA] ❌ Error registrando Service Worker:', error);
        });
    }

    // Verificar después de 3 segundos si el evento se disparó
    setTimeout(() => {
      if (!beforeinstallpromptSupported && !isStandalone && !isIOSStandalone) {
        console.warn('[PWA] ⚠️ beforeinstallprompt NO se disparó después de 3s');
        console.log('[PWA] Posibles razones:');
        console.log('  1. No cumple criterios de PWA (verifica Lighthouse)');
        console.log('  2. Usuario ya instaló la app antes');
        console.log('  3. Navegador no soporta instalación (Safari, Firefox)');
        console.log('  4. manifest.json tiene errores');
        console.log('[PWA] Mostrando banner en modo DEBUG');
        debugInfo = 'Evento no disparado - Modo DEBUG activo';
        
        // En modo DEBUG, mostrar de todas formas
        if (DEBUG_MODE) {
          showInstallButton = true;
        }
      }
    }, 3000);

    // Log de información útil
    console.log('[PWA] Información del navegador:');
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - Display Mode:', isStandalone ? 'standalone' : 'browser');
    console.log('  - Service Worker:', 'serviceWorker' in navigator ? 'soportado' : 'NO soportado');
  });

  async function handleInstallClick() {
    if (!deferredPrompt) {
      console.warn('[PWA] ⚠️ No hay prompt de instalación disponible');
      if (DEBUG_MODE) {
        alert('⚠️ Modo DEBUG activado\n\nEl evento beforeinstallprompt no se disparó.\n\nEsto es normal en:\n- Firefox (no soporta instalación)\n- Safari desktop (no soporta instalación)\n- Si ya instalaste la app antes\n\nPara instalar en Chrome:\n1. Abre Chrome DevTools (F12)\n2. Application → Manifest\n3. Verifica errores\n4. En Chrome, busca el ícono ⊕ en la barra de direcciones\n\nEn iOS Safari:\nCompartir → Agregar a pantalla de inicio');
      }
      return;
    }

    isInstalling = true;

    try {
      // Mostrar el prompt de instalación
      deferredPrompt.prompt();

      // Esperar la respuesta del usuario
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Usuario respondió: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('[PWA] ✅ Usuario aceptó instalar');
        debugInfo = 'Instalando...';
      } else {
        console.log('[PWA] ❌ Usuario rechazó instalar');
        debugInfo = 'Instalación cancelada';
      }
    } catch (error) {
      console.error('[PWA] Error durante la instalación:', error);
      debugInfo = 'Error en instalación';
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
            {#if DEBUG_MODE && !deferredPrompt}
              <span class="ml-2 text-xs text-orange-600 dark:text-orange-400">(Modo DEBUG)</span>
            {/if}
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Accede más rápido y úsala offline
            {#if DEBUG_MODE && debugInfo}
              <span class="block text-xs text-gray-500 dark:text-gray-500 mt-1">Debug: {debugInfo}</span>
            {/if}
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
