<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { createEventDispatcher } from 'svelte';
  import UserFoodForm from '$lib/components/UserFoodForm.svelte';
  import { toasts } from '$lib/stores/toast';
  import { capitalize } from '$lib/utils/formatters';

  type SearchItem = { id: string; name: string; source: 'global' | 'user' };

  const dispatch = createEventDispatcher<{ added: void }>();

  // Fecha seleccionada por el usuario (YYYY-MM-DD). Si no se pasa, se usa hoy.
  let { date, profileId } = $props<{ date?: string; profileId?: string | null }>();

  const readStoredProfileId = (): string | null => {
    try {
      const stored = localStorage.getItem('activeProfileId');
      return stored && stored.length > 0 ? stored : null;
    } catch {
      return null;
    }
  };

  let query = $state('');
  let results = $state<SearchItem[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  // Usamos clave compuesta para evitar colisiones entre IDs de tablas distintas
  let gramsByKey = $state<Record<string, number>>({});
  let debounceId: ReturnType<typeof setTimeout> | null = null;
  let searchInput: HTMLInputElement | null = null;
  let showCreate = $state(false);
  let showMyFoods = $state(false);
  let myFoods = $state<SearchItem[]>([]);
  let myFoodsLoading = $state(false);
  let myFoodsError = $state<string | null>(null);
  let editFoodId = $state<string | null>(null);

  const itemKey = (it: SearchItem) => `${it.source}:${it.id}`;

  function onInput(e: Event) {
    const target = e.target as HTMLInputElement;
    query = target.value;
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(searchFoods, 300);
  }

  function startEditUserFood(food: SearchItem) {
    if (food.source !== 'user') return;
    showCreate = false;
    editFoodId = food.id;
  }

  async function searchFoods() {
    const q = query.trim();
    if (q.length < 2) {
      results = [];
      error = null;
      return;
    }
    loading = true;
    error = null;
    try {
      // Normalizar la consulta del usuario (remover acentos, convertir a minúsculas)
      const normalizedQuery = q.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const [gRes, uRes] = await Promise.all([
        // Buscar usando la función normalize_text para ignorar acentos
        supabase.rpc('search_foods_normalized', { search_term: normalizedQuery }),
        supabase.rpc('search_userfoods_normalized', { search_term: normalizedQuery })
      ]);

      if (gRes.error) {
        // Si la función RPC no existe, usar búsqueda tradicional con ilike
        const fallbackRes = await supabase.from('Food').select('id, name').ilike('name', `%${q}%`).limit(10);
        if (fallbackRes.error) throw fallbackRes.error;
        const globalItems: SearchItem[] = (fallbackRes.data || []).map((r: any) => ({ id: String(r.id), name: r.name, source: 'global' }));
        
        const fallbackUserRes = await supabase.from('UserFood').select('id, name').ilike('name', `%${q}%`).limit(10);
        let userItems: SearchItem[] = [];
        if (!fallbackUserRes.error) {
          userItems = (fallbackUserRes.data || []).map((r: any) => ({ id: String(r.id), name: r.name, source: 'user' }));
        }
        results = [...userItems, ...globalItems];
      } else {
        const globalItems: SearchItem[] = (gRes.data || []).map((r: any) => ({ id: String(r.id), name: r.name, source: 'global' }));
        let userItems: SearchItem[] = [];
        
        if (uRes.error) {
          const msg = uRes.error?.message ?? '';
          const code = (uRes.error as any)?.code;
          // If relation UserFood doesn't exist yet (migrations not applied), treat as empty gracefully
          if (code === '42P01' || /relation .*UserFood.* does not exist/i.test(msg)) {
            userItems = [];
          } else {
            throw uRes.error;
          }
        } else {
          userItems = (uRes.data || []).map((r: any) => ({ id: String(r.id), name: r.name, source: 'user' }));
        }
        results = [...userItems, ...globalItems];
      }
      
      // preset grams to 100
      results.forEach(it => { const k = itemKey(it); if (!(k in gramsByKey)) gramsByKey[k] = 100; });
    } catch (err: any) {
      error = err?.message ?? 'Error al buscar';
      toasts.error(error ?? 'Error al buscar');
      results = [];
    } finally {
      loading = false;
    }
  }

  async function addItem(food: SearchItem) {
    try {
      loading = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        error = 'No session';
        loading = false;
        return;
      }
      const grams = Number(gramsByKey[itemKey(food)] ?? 100) || 100;
      const today = new Date().toISOString().split('T')[0];
      const logDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : today;
      const id = crypto.randomUUID();
      const currentProfileId = (() => {
        if (typeof profileId === 'string' && profileId.length > 0) return profileId;
        const stored = readStoredProfileId();
        return stored;
      })();
      const payload: Record<string, any> = food.source === 'global'
        ? { id, userId: session.user.id, date: logDate, foodId: food.id, quantity: grams }
        : { id, userId: session.user.id, date: logDate, userFoodId: food.id, quantity: grams };
      if (currentProfileId) {
        payload.userProfileId = currentProfileId;
      }
      const { error: insertErr } = await supabase.from('FoodLog').insert(payload as any);
      loading = false;
      if (insertErr) {
        error = insertErr.message;
        toasts.error(`No se pudo añadir: ${insertErr.message}`);
        return;
      }
      // notify parent to refresh summary
      dispatch('added');
      toasts.success('Comida añadida');
      // reset UI
      query = '';
      results = [];
      gramsByKey = {};
      searchInput?.focus();
    } catch (e: any) {
      loading = false;
      error = e?.message ?? 'Unknown error';
      toasts.error(error ?? 'Unknown error');
    }
  }

  async function fetchMyFoods() {
    try {
      myFoodsLoading = true;
      myFoodsError = null;
      const { data, error: err } = await supabase
        .from('UserFood')
        .select('id, name')
        .order('name', { ascending: true });
      if (err) {
        const msg = err?.message ?? '';
        const code = (err as any)?.code;
        // relation missing -> treat as empty with no error shown
        if (code === '42P01' || /relation .*UserFood.* does not exist/i.test(msg)) {
          myFoods = [];
          myFoodsError = null;
          return;
        }
        throw err;
      }
      myFoods = (data || []).map((r: any) => ({ id: String(r.id), name: r.name, source: 'user' }));
    } catch (e: any) {
      myFoodsError = 'No se pudieron cargar tus alimentos';
      toasts.error(myFoodsError);
    } finally {
      myFoodsLoading = false;
    }
  }

  async function deleteUserFood(food: SearchItem) {
    if (food.source !== 'user') return;
    const confirmed = window.confirm(`¿Estás seguro que deseas eliminar el alimento "${food.name}"?\nLos consumos de este alimento también serán borrados.`);
    if (!confirmed) return;
    try {
      const { error: delErr } = await supabase.from('UserFood').delete().eq('id', food.id);
      if (delErr) {
        toasts.error(`No se pudo eliminar: ${delErr.message}`);
        return;
      }
      toasts.success('Alimento eliminado');
      // Actualiza panel y resultados
      myFoods = myFoods.filter(f => f.id !== food.id);
      results = results.filter(f => !(f.source === 'user' && f.id === food.id));
    } catch (e: any) {
      toasts.error(e?.message ?? 'Error desconocido');
    }
  }
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
  <h3 class="text-lg font-semibold mb-3">Agregar comida</h3>
  <div class="flex items-center gap-2 mb-4 flex-wrap">
    <button class="px-3 py-1.5 text-sm rounded bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600" onclick={async () => { showMyFoods = !showMyFoods; if (showMyFoods) { await fetchMyFoods(); } else { editFoodId = null; } }}>
      {showMyFoods ? 'Ocultar mis alimentos' : 'Mis alimentos'}
    </button>
    <button class="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-500" onclick={() => showCreate = !showCreate}>
      {showCreate ? 'Cerrar' : 'Agregar nuevo alimento'}
    </button>
  </div>
  {#if showCreate}
    <div class="mb-3">
      <UserFoodForm
        on:created={(e) => {
          showCreate = false;
          const ufBase = e.detail as { id: string; name: string };
          const uf: SearchItem = { ...ufBase, source: 'user' };
          toasts.success('Alimento creado');
          query = uf.name;
          results = [uf, ...results.filter(r => !(r.source === 'user' && r.id === uf.id))];
          const k = itemKey(uf);
          gramsByKey = { ...gramsByKey, [k]: gramsByKey[k] ?? 100 };
          if (showMyFoods) fetchMyFoods();
        }}
        on:cancel={() => showCreate = false}
      />
    </div>
  {/if}
  {#if showMyFoods}
    <div class="mb-3 border rounded p-2 dark:border-gray-700">
      <h4 class="text-sm font-medium mb-2">Mis alimentos</h4>
      {#if myFoodsLoading}
        <p class="text-sm text-gray-500">Cargando…</p>
      {:else if myFoodsError}
        <p class="text-sm text-red-600">{myFoodsError}</p>
      {:else if myFoods.length === 0}
        <p class="text-sm text-gray-500">Aún no hay alimentos creados</p>
      {:else}
        <ul class="space-y-1">
          {#each myFoods as f (f.source + ':' + f.id)}
            <li class="flex items-center justify-between gap-2">
              <span class="truncate">{capitalize(f.name)}</span>
              <div class="flex items-center gap-2">
                <button class="px-2 py-1 text-xs rounded bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600" onclick={() => startEditUserFood(f)}>Editar</button>
                <button class="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-500" onclick={() => deleteUserFood(f)}>Eliminar</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    {#if editFoodId}
      <div class="mb-3">
        <UserFoodForm
          foodId={editFoodId}
          on:updated={(e) => {
            const uf = e.detail as { id: string; name: string };
            editFoodId = null;
            // refrescar listas
            fetchMyFoods();
            results = results.map((r) => (r.source === 'user' && r.id === uf.id ? { ...r, name: uf.name } : r));
          }}
          on:cancel={() => { editFoodId = null; }}
        />
      </div>
    {/if}
  {/if}
  <div class="flex gap-2 mt-3">
    <input
      class="flex-1 border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      type="text"
      placeholder={'Buscar alimento (mín. 2 letras)'}
      oninput={onInput}
      value={query}
      bind:this={searchInput}
    />
  </div>

  {#if error}
    <p class="mt-2 text-sm text-red-600">{error}</p>
  {/if}

  {#if loading}
    <p class="mt-2 text-sm text-gray-500">Buscando…</p>
  {/if}

  {#if results.length > 0}
    <ul class="mt-3 space-y-2">
      {#each results as food (food.source + ':' + food.id)}
        <li class="flex items-center gap-2 flex-wrap">
          <span class="flex-1 min-w-0 truncate">{capitalize(food.name)}</span>
          <input
            type="number"
            min="1"
            step="1"
            class="w-20 sm:w-24 border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={gramsByKey[itemKey(food)] ?? 100}
            oninput={(e) => {
              const v = Number((e.currentTarget as HTMLInputElement).value);
              const k = itemKey(food);
              gramsByKey = { ...gramsByKey, [k]: isNaN(v) || v < 1 ? 1 : Math.round(v) };
            }}
            aria-label="Cantidad (g)"
          />
          <button
            class="w-full sm:w-auto px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-60"
            onclick={() => addItem(food)}
            disabled={loading}
          >
            Añadir
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
