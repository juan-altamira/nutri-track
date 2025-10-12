<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto, invalidate } from '$app/navigation';
  import { onMount } from 'svelte';
  import NutrientSummary from '$lib/components/NutrientSummary.svelte';
  import FoodSearch from '$lib/components/FoodSearch.svelte';
  import ProfileSelector from '$lib/components/ProfileSelector.svelte';
  import { toasts } from '$lib/stores/toast';
  import { capitalize } from '$lib/utils/formatters';

  const props = $props();
  let deletingId = $state<string | null>(null);
  let refreshing = $state(false);
  let selectedDate = $state<string>(props.data.date);
  let selectedProfileId = $state<string | null>(props.data.profileId ?? null);

  // Sincroniza el selector si la fecha en data cambia (navegación o revalidación)
  $effect(() => {
    selectedDate = props.data.date;
  });
  $effect(() => {
    selectedProfileId = props.data.profileId ?? null;
  });

  // Muestra toast si el load devolvió error
  $effect(() => {
    if (props.data?.error) toasts.error(String(props.data.error));
  });

  const isValidDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  const normalizeProfileId = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.toString().trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const navigateDashboard = async (dateParam: string, profile: string | null) => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams();
    q.set('date', dateParam);
    if (profile) q.set('profileId', profile);
    const target = `/dashboard?${q.toString()}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === target) return;
    await goto(target, { replaceState: true, noScroll: true });
  };

  // Si no hay profileId en la URL, usa el almacenado (activeProfileId) para hidratar el dashboard
  $effect(() => {
    if (!selectedProfileId) {
      try {
        const stored = normalizeProfileId(localStorage.getItem('activeProfileId'));
        if (stored) {
          selectedProfileId = stored;
          navigateDashboard(selectedDate, stored);
        }
      } catch { /* noop */ }
    }
  });

  async function onDateChange(v: string) {
    if (!isValidDate(v)) return;
    selectedDate = v;
    await navigateDashboard(v, selectedProfileId);
  }

  async function onProfileChange(e: CustomEvent<{ profileId: string | null }>) {
    const pid = normalizeProfileId(e.detail?.profileId ?? null);
    if (pid === selectedProfileId) return;
    selectedProfileId = pid;
    try { console.log('[dashboard] onProfileChange pid=', pid); } catch {}
    await navigateDashboard(selectedDate, pid);
  }

  async function refreshSummary() {
    try {
      refreshing = true;
      await invalidate('app:daily-summary');
    } finally {
      refreshing = false;
    }
  }

  const syncFromStorage = async () => {
    try {
      const stored = normalizeProfileId(localStorage.getItem('activeProfileId'));
      if (stored !== selectedProfileId) {
        selectedProfileId = stored;
        await navigateDashboard(selectedDate, stored);
      }
    } catch {}
  };

  onMount(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'activeProfileId') {
        syncFromStorage();
      }
    };
    const handleFocus = () => {
      syncFromStorage();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  });

  async function signOut() {
    await supabase.auth.signOut();
    goto('/login');
  }

  async function deleteLog(id: string) {
    try {
      deletingId = id;
      const { error: delErr } = await supabase.from('FoodLog').delete().eq('id', id);
      deletingId = null;
      if (delErr) {
        toasts.error(`No se pudo eliminar: ${delErr.message}`);
        return;
      }
      toasts.success('Registro eliminado');
      await refreshSummary();
    } catch (e: any) {
      deletingId = null;
      toasts.error(e?.message ?? 'Error desconocido');
    }
  }
</script>

<svelte:head>
  <title>Panel principal | Nutri-Track</title>
</svelte:head>

<div class="p-4 pb-20 max-w-3xl mx-auto bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5 mb-6">
    <h1 class="text-xl sm:text-2xl font-bold">Resumen diario</h1>
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 sm:gap-4 w-full sm:w-auto">
      <input
        type="date"
        class="w-full sm:w-auto border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        value={selectedDate}
        onchange={(e) => onDateChange((e.currentTarget as HTMLInputElement).value)}
        aria-label="Seleccionar fecha"
      />
      <ProfileSelector on:profileChange={onProfileChange} />
      <a
        href={`/profiles?date=${selectedDate}`}
        class="w-full sm:w-auto inline-flex justify-center items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 text-center whitespace-nowrap mt-2 sm:mt-0"
      >
        Gestionar perfiles
      </a>
      <button
        class="w-full sm:w-auto px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 mt-2 sm:mt-0"
        onclick={signOut}
      >
        Cerrar sesión
      </button>
    </div>
  </div>

  <div class="mt-4 mb-10">
    <FoodSearch on:added={refreshSummary} date={selectedDate} profileId={selectedProfileId} />
  </div>

  {#if props.data?.error}
    <p class="text-red-600">Error: {props.data.error}</p>
  {:else if props.data?.summary}
    {#key (props.data.profileId ?? 'none') + ':' + selectedDate}
      <NutrientSummary summary={props.data.summary.summary ?? []} />

      {#if import.meta.env.DEV && props.data?.summary?.debug}
        <details class="mt-4">
          <summary class="cursor-pointer text-sm text-gray-600 dark:text-gray-400">Debug diario (solo dev)</summary>
          <pre class="mt-2 text-xs overflow-auto max-h-64 p-2 rounded bg-gray-50 dark:bg-gray-800">{JSON.stringify(props.data.summary.debug, null, 2)}</pre>
        </details>
      {/if}

      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-3">Consumos de hoy</h2>
        {#if (props.data.summary.foodLogs ?? []).length === 0}
          <p class="text-gray-500">Aún no registraste comidas hoy.</p>
        {:else}
          <ul class="space-y-3">
            {#each props.data.summary.foodLogs as log (log.id)}
              <li class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-base truncate mb-1">{capitalize(log.UserFood?.name ?? log.Food?.name ?? 'Alimento')}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      <span class="font-medium">{log.quantity} gramos</span>
                    </div>
                  </div>
                  <button
                    class="sm:px-3 sm:py-1.5 sm:bg-red-600 sm:text-white sm:rounded-md sm:w-auto sm:h-auto sm:hover:bg-red-500 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-60 whitespace-nowrap flex-shrink-0 transition-colors flex items-center justify-center"
                    onclick={() => deleteLog(log.id)}
                    disabled={deletingId === log.id}
                    aria-label="Eliminar alimento"
                  >
                    {#if deletingId === log.id}
                      <span class="inline-block text-xs">⏳</span>
                    {:else}
                      <span class="hidden sm:inline">Eliminar</span>
                      <span class="sm:hidden text-xl font-bold leading-none text-red-600 dark:text-red-500">×</span>
                    {/if}
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/key}
  {:else}
    <p class="text-gray-500">No data</p>
  {/if}

  {#if refreshing}
    <p class="mt-2 text-sm text-gray-500">Actualizando…</p>
  {/if}
</div>
