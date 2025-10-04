<script lang="ts">
  import { toasts } from '$lib/stores/toast';
  import { fly, fade } from 'svelte/transition';

  const typeStyles: Record<string, string> = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-slate-800 text-white',
    warning: 'bg-amber-600 text-black'
  };
</script>

<div class="fixed top-4 right-4 z-[60] space-y-2">
  {#each $toasts as t (t.id)}
    <div
      class={`min-w-[240px] max-w-sm rounded shadow-lg px-3 py-2 flex items-start gap-2 ${typeStyles[t.type] || typeStyles.info}`}
      in:fly={{ y: -8, duration: 150 }}
      out:fade={{ duration: 150 }}
      role={t.type === 'error' ? 'alert' : 'status'}
      aria-live={t.type === 'error' ? 'assertive' : 'polite'}
    >
      <span class="mt-0.5 select-none">
        {#if t.type === 'success'}
          ✅
        {:else if t.type === 'error'}
          ⚠️
        {:else if t.type === 'warning'}
          🟨
        {:else}
          🛈
        {/if}
      </span>
      <div class="flex-1 text-sm leading-snug">{t.message}</div>
      <button
        class="ml-2 shrink-0 opacity-80 hover:opacity-100"
        aria-label="Cerrar"
        onclick={() => toasts.dismiss(t.id)}
      >
        ✕
      </button>
    </div>
  {/each}
</div>
