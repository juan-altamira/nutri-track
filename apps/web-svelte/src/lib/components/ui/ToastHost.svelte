<script lang="ts">
  import { toasts, type Toast } from '$lib/stores/toast';
  import { fly, fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const typeConfig: Record<string, { bg: string; icon: string; iconClass: string }> = {
    success: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
      iconClass: 'text-white',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-rose-500',
      iconClass: 'text-white',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      iconClass: 'text-white',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      iconClass: 'text-white',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    }
  };

  function getProgress(toast: Toast, startTime: number) {
    let frame: number;
    let element: HTMLDivElement;

    function animate() {
      if (!element) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / toast.timeout) * 100, 100);
      element.style.width = `${100 - progress}%`;
      
      if (progress < 100) {
        frame = requestAnimationFrame(animate);
      }
    }

    return {
      mount: (el: HTMLDivElement) => {
        element = el;
        frame = requestAnimationFrame(animate);
      },
      destroy: () => {
        if (frame) cancelAnimationFrame(frame);
      }
    };
  }
</script>

<div class="fixed top-4 right-4 z-[60] space-y-3 pointer-events-none">
  {#each $toasts as t (t.id)}
    {@const config = typeConfig[t.type] || typeConfig.info}
    {@const progressHandler = getProgress(t, Date.now())}
    <div
      class="pointer-events-auto min-w-[280px] max-w-md rounded-xl shadow-2xl backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
      in:fly={{ y: -20, duration: 300, easing: quintOut }}
      out:scale={{ duration: 200, start: 0.95, opacity: 0 }}
      role={t.type === 'error' ? 'alert' : 'status'}
      aria-live={t.type === 'error' ? 'assertive' : 'polite'}
    >
      <!-- Contenido principal -->
      <div class="flex items-start gap-3 p-4">
        <!-- Icono -->
        <div class={`flex-shrink-0 w-6 h-6 ${config.iconClass}`}>
          <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html config.icon}
          </svg>
        </div>

        <!-- Mensaje -->
        <div class="flex-1 pt-0.5">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
            {t.message}
          </p>
        </div>

        <!-- Botón cerrar -->
        <button
          class="flex-shrink-0 w-5 h-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar notificación"
          onclick={() => toasts.dismiss(t.id)}
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Barra de progreso -->
      <div class="h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          use:progressHandler.mount
          class={`h-full transition-all ${config.bg}`}
          style="width: 100%"
        ></div>
      </div>
    </div>
  {/each}
</div>
