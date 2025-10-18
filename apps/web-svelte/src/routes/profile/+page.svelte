<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { toasts } from '$lib/stores/toast';

  let age: number | '' = '';
  let sex: 'MALE' | 'FEMALE' | '' = '';
  let macroEnabled: boolean = false;
  let macroProtein: number | '' = '';
  let macroCarbs: number | '' = '';
  let macroFat: number | '' = '';
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let message: string | null = null;
  let returnDate: string | null = null;

  // Reactive helpers to compute calories goal from macros (4/4/9)
  $: pNum = typeof macroProtein === 'number' ? macroProtein : Number(macroProtein);
  $: cNum = typeof macroCarbs === 'number' ? macroCarbs : Number(macroCarbs);
  $: fNum = typeof macroFat === 'number' ? macroFat : Number(macroFat);
  $: estimatedCalories = (macroEnabled && ![pNum, cNum, fNum].some((n) => isNaN(n as number)))
    ? Math.round((pNum as number) * 4 + (cNum as number) * 4 + (fNum as number) * 9)
    : 0;

  onMount(async () => {
    // Read optional ?date=YYYY-MM-DD to preserve navigation back to dashboard
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get('date');
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) returnDate = d;
    } catch { /* noop */ }

    // Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/login');
      return;
    }

    const { data, error: err } = await supabase
      .from('profiles')
      .select('age, sex')
      .eq('id', session.user.id)
      .maybeSingle();

    if (err) {
      const code = (err as any)?.code;
      if (code === '42P01') {
        // Tabla profiles no existe: cargar desde localStorage si hubiera
        try {
          if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('profileLocal');
            if (raw) {
              const obj = JSON.parse(raw);
              age = (obj.age ?? '') as any;
              sex = (obj.sex ?? '') as any;
            }
          }
        } catch { /* noop */ }
      } else {
        error = err.message;
        toasts.error(`Error cargando perfil: ${err.message}`);
      }
    } else if (data) {
      age = (data.age ?? '') as any;
      sex = (data.sex ?? '') as any;
    }

    // Intentar obtener objetivos de macronutrientes si existen columnas en profiles
    const { data: mdata, error: merr } = await supabase
      .from('profiles')
      .select('macroProtein, macroCarbs, macroFat')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!merr && mdata) {
      macroProtein = (mdata as any).macroProtein ?? '';
      macroCarbs = (mdata as any).macroCarbs ?? '';
      macroFat = (mdata as any).macroFat ?? '';
      macroEnabled = [macroProtein, macroCarbs, macroFat].some((v) => typeof v === 'number' ? v > 0 : v !== '');
    } else {
      // Fallback a localStorage si no hay columnas o falla la consulta
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem('macroTargets');
          if (raw) {
            const obj = JSON.parse(raw);
            macroEnabled = !!obj.enabled;
            macroProtein = obj.protein ?? '';
            macroCarbs = obj.carbs ?? '';
            macroFat = obj.fat ?? '';
          }
        }
      } catch { /* noop */ }
    }

    loading = false;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;
    message = null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/login');
      return;
    }

    // Simple validations
    const ageNum = typeof age === 'number' ? age : Number(age);
    if (!ageNum || ageNum < 1 || ageNum > 120) {
      error = 'Edad inválida (1-120).';
      toasts.error(error);
      return;
    }
    if (sex !== 'MALE' && sex !== 'FEMALE') {
      error = 'Sexo inválido. Elige MALE o FEMALE.';
      toasts.error(error);
      return;
    }

    saving = true;
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, age: ageNum, sex }, { onConflict: 'id' });
    saving = false;

    if (upsertErr) {
      const code = (upsertErr as any)?.code;
      if (code === '42P01') {
        // Guardar perfil localmente si no existe la tabla profiles
        try { if (typeof localStorage !== 'undefined') localStorage.setItem('profileLocal', JSON.stringify({ age: ageNum, sex })); } catch { /* noop */ }
        toasts.info('La tabla "profiles" no existe. Guardé tu perfil localmente.');
      } else {
        error = upsertErr.message;
        toasts.error(`Error al guardar: ${upsertErr.message}`);
        // continuar con el guardado de macros igualmente
      }
    }

    // Persistir objetivos de macronutrientes (si están habilitados)
    if (macroEnabled) {
      const p = typeof macroProtein === 'number' ? macroProtein : Number(macroProtein);
      const c = typeof macroCarbs === 'number' ? macroCarbs : Number(macroCarbs);
      const f = typeof macroFat === 'number' ? macroFat : Number(macroFat);

      if ([p, c, f].some((n) => isNaN(n) || n < 0 || n > 1000)) {
        toasts.error('Objetivos de macros inválidos (0–1000 g).');
      } else {
        const { error: macroErr } = await supabase
          .from('profiles')
          .update({ macroProtein: p, macroCarbs: c, macroFat: f })
          .eq('id', session.user.id);

        if (macroErr) {
          // Guardar localmente si las columnas no existen o hay error de esquema
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('macroTargets', JSON.stringify({ enabled: true, protein: p, carbs: c, fat: f }));
              toasts.success('Macros guardadas localmente. Crea columnas macroProtein/macroCarbs/macroFat en profiles para sincronizar.');
            }
          } catch { /* noop */ }
        } else {
          // Limpiar fallback local si existe
          try { if (typeof localStorage !== 'undefined') localStorage.removeItem('macroTargets'); } catch { /* noop */ }
        }
      }
    } else {
      // Intentar limpiar en servidor; ignorar error si columnas no existen
      await supabase
        .from('profiles')
        .update({ macroProtein: null, macroCarbs: null, macroFat: null })
        .eq('id', session.user.id);
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem('macroTargets'); } catch { /* noop */ }
    }

    message = 'Perfil actualizado.';
    toasts.success('Perfil actualizado');
  }
</script>

<svelte:head>
  <title>Modificar macronutrientes y calorías | Nutri-Track</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-xl mx-auto bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
    <h1 class="text-xl sm:text-2xl font-bold">Modificar macronutrientes y calorías</h1>
    <a
      href={returnDate ? `/dashboard?date=${returnDate}` : '/dashboard'}
      class="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      Volver al panel principal
    </a>
  </div>

  {#if loading}
    <p class="text-gray-500">Cargando…</p>
  {:else}
    {#if error}
      <p class="mb-3 text-sm text-red-600">{error}</p>
    {/if}
    {#if message}
      <p class="mb-3 text-sm text-emerald-600">{message}</p>
    {/if}

    <form class="space-y-4" onsubmit={handleSubmit}>
      <div>
        <label for="age" class="block text-sm font-medium mb-1">Edad</label>
        <input
          id="age"
          type="number"
          min="1"
          max="120"
          step="1"
          class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={age === '' ? '' : String(age)}
          oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); age = isNaN(v) ? '' : Math.round(v); }}
          required
        />
      </div>

      <div>
        <label for="sex" class="block text-sm font-medium mb-1">Sexo</label>
        <select
          id="sex"
          class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={sex}
          onchange={(e) => { sex = (e.currentTarget as HTMLSelectElement).value as any; }}
          required
        >
          <option value="" disabled>Selecciona…</option>
          <option value="MALE">MALE</option>
          <option value="FEMALE">FEMALE</option>
        </select>
      </div>

      <fieldset class="border rounded p-3 dark:border-gray-700">
        <legend class="text-sm font-medium">Objetivos de macronutrientes</legend>
        <div class="mt-2 flex items-center gap-2">
          <input id="macroEnabled" type="checkbox" checked={macroEnabled} onchange={(e) => { macroEnabled = (e.currentTarget as HTMLInputElement).checked; }} />
          <label for="macroEnabled" class="text-sm">Activar objetivos personalizados</label>
        </div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">En gramos por día. Se usarán los recomendados si no activás esta opción.</p>

        <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="macroProtein" class="block text-sm mb-1">Proteínas (g/día)</label>
            <input
              id="macroProtein"
              type="number"
              min="0"
              max="1000"
              step="1"
              class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={macroProtein === '' ? '' : String(macroProtein)}
              oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); macroProtein = isNaN(v) ? '' : Math.round(v); }}
              disabled={!macroEnabled}
            />
          </div>
          <div>
            <label for="macroCarbs" class="block text-sm mb-1">Carbohidratos (g/día)</label>
            <input
              id="macroCarbs"
              type="number"
              min="0"
              max="1000"
              step="1"
              class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={macroCarbs === '' ? '' : String(macroCarbs)}
              oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); macroCarbs = isNaN(v) ? '' : Math.round(v); }}
              disabled={!macroEnabled}
            />
          </div>
          <div>
            <label for="macroFat" class="block text-sm mb-1">Grasas (g/día)</label>
            <input
              id="macroFat"
              type="number"
              min="0"
              max="1000"
              step="1"
              class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={macroFat === '' ? '' : String(macroFat)}
              oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); macroFat = isNaN(v) ? '' : Math.round(v); }}
              disabled={!macroEnabled}
            />
          </div>
        </div>

        <div class="mt-3 text-sm">
          {#if macroEnabled}
            <span class="text-gray-700 dark:text-gray-300">Calorías objetivo (estimado): </span>
            <span class="font-semibold">{estimatedCalories} kcal</span>
          {:else}
            <span class="text-gray-500 dark:text-gray-400">Activá los objetivos personalizados para ver el cálculo de calorías objetivo.</span>
          {/if}
        </div>
      </fieldset>

      <button
        type="submit"
        class="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
        disabled={saving}
      >
        {#if saving}
          Guardando…
        {:else}
          Guardar
        {/if}
      </button>
    </form>
  {/if}
</div>
