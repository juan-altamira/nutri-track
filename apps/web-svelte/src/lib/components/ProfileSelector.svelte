<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { createEventDispatcher, onMount } from 'svelte';
  import { toasts } from '$lib/stores/toast';

  type Profile = {
    id: string;
    name: string;
    age: number;
    sex: 'MALE' | 'FEMALE';
  };

  const dispatch = createEventDispatcher<{ profileChange: { profileId: string | null } }>();

  let profiles = $state<Profile[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedId = $state<string | 'default' | ''>('');

  const readStored = (): string | null => {
    try { return localStorage.getItem('activeProfileId'); } catch { return null; }
  };
  const writeStored = (id: string | null) => {
    try {
      if (typeof id === 'string') localStorage.setItem('activeProfileId', id);
      else localStorage.removeItem('activeProfileId');
    } catch {}
  };

  async function loadProfiles() {
    try {
      loading = true;
      error = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error: err } = await supabase
        .from('UserProfile')
        .select('id, name, age, sex')
        .order('createdAt', { ascending: true });
      if (err) throw err;
      profiles = (data || []) as any;
      const stored = readStored();
      if (stored && profiles.some(p => p.id === stored)) {
        selectedId = stored as any;
      } else {
        selectedId = '';
      }
      // Notificar selección inicial para hidratar el dashboard sin interacción del usuario
      dispatch('profileChange', { profileId: selectedId || null });
    } catch (e: any) {
      const msg = e?.message ?? 'No se pudieron cargar los perfiles';
      error = msg;
      toasts.error(msg);
    } finally {
      loading = false;
    }
  }

  function onChange(id: string) {
    selectedId = id as any;
    writeStored(id || null);
    dispatch('profileChange', { profileId: id || null });
  }

  onMount(loadProfiles);
</script>

<div class="flex items-center gap-3">
  <label for="profile-selector" class="text-sm text-gray-700 dark:text-gray-200">Perfil:</label>
  <select
    id="profile-selector"
    class="border rounded-md px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
    disabled={loading}
    bind:value={selectedId as any}
    oninput={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}
  >
    <option value="">Por defecto</option>
    {#each profiles as p}
      <option value={p.id}>{p.name}</option>
    {/each}
  </select>
</div>
