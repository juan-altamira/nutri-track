<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { toasts } from '$lib/stores/toast';
  import { requireSubscription } from '$lib/utils/authGuard';

  type Sex = 'MALE' | 'FEMALE';
  type Profile = { id: string; name: string; age: number; sex: Sex; macroProtein: number | null; macroCarbs: number | null; macroFat: number | null };

  let loading = $state(true);
  let saving = $state(false);
  let profiles = $state<Profile[]>([]);
  let selectedId = $state<string | null>(null);
  let error: string | null = null;

  // Form crear/editar perfil
  let formName = $state('');
  let formAge: number | '' = $state('');
  let formSex: Sex | '' = $state('');
  let formMacroProtein: number | '' = $state('');
  let formMacroCarbs: number | '' = $state('');
  let formMacroFat: number | '' = $state('');
  let isEdit = $state(false);
  let step = $state<number>(1); // 1: Edad/Sexo -> Siguiente; 2: Nombre + Macros/Fibra + Micronutrientes
  let viewNonce = $state(0);

  //

  // Editor de RDAs por nutriente del perfil seleccionado
  type NumMap = Record<string, number | ''>;
  let rdaValues: NumMap = $state({});
  let rdaUnits: Record<string, string> = $state({});
  let rdaLoading = $state(false);
  let rdaSaving = $state(false);

  //

  // RDAs recomendados (por edad/sexo) para mostrar si el valor del perfil es 0
  let recommendedRDA: Record<string, { value: number; unit: string }> = $state({});

  function getDisplayValue(key: string, defUnit: string): number {
    // Pura: no muta rdaUnits ni otros estados durante el render
    const v = Number(rdaValues[key] ?? 0);
    if (v > 0) return v;
    const rec = recommendedRDA[key];
    if (rec && rec.value > 0) return rec.value;
    return 0;
  }

  // Cálculo en tiempo real de calorías objetivo (4/4/9) a partir de macros del formulario
  const computedProfileCalories = $derived(
    Math.round(
      Number(formMacroProtein || 0) * 4 +
      Number(formMacroCarbs || 0) * 4 +
      Number(formMacroFat || 0) * 9
    )
  );

  // Visibilidad de pasos controlada directamente por step/isEdit

  const VITAMINS = [
    { key: 'vitaminA', label: 'Vitamina A', unit: 'µg' },
    { key: 'vitaminC', label: 'Vitamina C', unit: 'mg' },
    { key: 'vitaminD', label: 'Vitamina D', unit: 'µg' },
    { key: 'vitaminE', label: 'Vitamina E', unit: 'mg' },
    { key: 'vitaminK', label: 'Vitamina K', unit: 'µg' },
    { key: 'vitaminB1', label: 'Vitamina B1', unit: 'mg' },
    { key: 'vitaminB2', label: 'Vitamina B2', unit: 'mg' },
    { key: 'vitaminB3', label: 'Vitamina B3', unit: 'mg' },
    { key: 'vitaminB5', label: 'Vitamina B5', unit: 'mg' },
    { key: 'vitaminB6', label: 'Vitamina B6', unit: 'mg' },
    { key: 'vitaminB7', label: 'Vitamina B7', unit: 'µg' },
    { key: 'vitaminB12', label: 'Vitamina B12', unit: 'µg' },
    { key: 'folate', label: 'Vitamina B9 (Folato)', unit: 'µg' },
    { key: 'choline', label: 'Colina', unit: 'mg' },
  ] as const;

  // Extra: fibra se edita junto a macros pero se persiste como RDA (g)
  const EXTRA = [
    { key: 'fiber', label: 'Fibra', unit: 'g' }
  ] as const;

  const MINERALS = [
    { key: 'calcium', label: 'Calcio', unit: 'mg' },
    { key: 'iron', label: 'Hierro', unit: 'mg' },
    { key: 'magnesium', label: 'Magnesio', unit: 'mg' },
    { key: 'zinc', label: 'Zinc', unit: 'mg' },
    { key: 'potassium', label: 'Potasio', unit: 'mg' },
    { key: 'sodium', label: 'Sodio', unit: 'mg' },
    { key: 'phosphorus', label: 'Fósforo', unit: 'mg' },
    { key: 'selenium', label: 'Selenio', unit: 'µg' },
    { key: 'copper', label: 'Cobre', unit: 'µg' },
    { key: 'manganese', label: 'Manganeso', unit: 'mg' },
    { key: 'iodine', label: 'Yodo', unit: 'µg' },
    { key: 'chloride', label: 'Cloruro', unit: 'mg' },
  ] as const;

  function readActiveProfileId(): string | null {
    try { return localStorage.getItem('activeProfileId'); } catch { return null; }
  }

  async function saveAll() {
    try {
      // 1) Guardar/crear el perfil pero sin recargar aún, para evitar que se pisen los valores del editor
      await saveProfile(true);
      // 2) Guardar RDAs del editor actual (incluida fibra)
      if (selectedId) {
        await saveRDAs();
      }
      // 3) Recargar perfiles y RDAs desde servidor para reflejar lo guardado
      await loadProfiles();
      toasts.success('Perfil y RDAs guardados');
    } catch (e) {
      // Los errores ya se notifican dentro de cada función
    }
  }

  function computeAgeGroup(age: number): string {
    if (age <= 8) return '4-8';
    if (age <= 13) return '9-13';
    if (age <= 18) return '14-18';
    if (age <= 50) return '19-50';
    if (age <= 70) return '51-70';
    return '71+';
  }

  async function prefillFromAgeSex(ageNum: number, sex: Sex) {
    recommendedRDA = {};
    // Lee RDAs recomendados para precargar macro/fibra y micronutrientes en el paso 2
    const ageGroup = computeAgeGroup(ageNum);
    let rows: any[] = [];
    try {
      const { data, error } = await supabase
        .from('RecommendedDailyAllowance')
        .select('nutrient, value, unit, sex')
        .eq('ageGroup', ageGroup)
        .or(`sex.eq.${sex},sex.is.null`);
      if (error) throw error;
      rows = data || [];
    } catch (e: any) {
      toasts.error(`No se pudieron precargar RDAs por defecto: ${e?.message || e}`);
      rows = [];
    }
    // Reset locales
    rdaValues = {};
    rdaUnits = {};
    // Elegir por clave preferentemente específica por sexo
    const pickMap = new Map<string, { value: number; unit: string; sex: string | null }>();
    for (const row of rows) {
      const key = String((row as any).nutrient);
      const val = Number((row as any).value) || 0;
      const unit = String((row as any).unit || '');
      const s = (row as any).sex ?? null;
      if (!pickMap.has(key) || (!pickMap.get(key)!.sex && s)) {
        pickMap.set(key, { value: val, unit, sex: s });
      }
    }
    // Macros y fibra
    if (pickMap.has('protein')) formMacroProtein = pickMap.get('protein')!.value as any;
    if (pickMap.has('carbohydrates')) formMacroCarbs = pickMap.get('carbohydrates')!.value as any;
    if (pickMap.has('fat')) formMacroFat = pickMap.get('fat')!.value as any;
    if (pickMap.has('fiber')) { rdaValues['fiber'] = pickMap.get('fiber')!.value; rdaUnits['fiber'] = pickMap.get('fiber')!.unit || 'g'; }
    // Micronutrientes esperados
    for (const { key, unit } of [...VITAMINS, ...MINERALS]) {
      const rec = pickMap.get(key);
      if (rec && rec.value > 0) {
        recommendedRDA[key] = { value: rec.value, unit: rec.unit || unit };
      }
      if (rec && rec.value > 0) {
        rdaValues[key] = rec.value;
        rdaUnits[key] = rec.unit || unit;
      } else {
        if (!rdaUnits[key]) rdaUnits[key] = unit;
        if (rdaValues[key] == null) rdaValues[key] = 0;
      }
    }
    // Asegurar unidades por defecto para cualquier clave faltante
    [...VITAMINS, ...MINERALS, ...EXTRA].forEach(({ key, unit }) => { if (!rdaUnits[key]) rdaUnits[key] = unit; if (rdaValues[key] == null) rdaValues[key] = 0; });
  }
  function writeActiveProfileId(id: string | null) {
    try {
      if (id) localStorage.setItem('activeProfileId', id); else localStorage.removeItem('activeProfileId');
    } catch {}
  }

  async function loadProfiles() {
    try {
      loading = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toasts.error('No hay sesión');
        return;
      }
      const { data, error: err } = await supabase
        .from('UserProfile')
        .select('id, name, age, sex, "macroProtein", "macroCarbs", "macroFat"')
        .order('createdAt', { ascending: true });
      if (err) throw err;
      profiles = (data || []) as any;
      const stored = readActiveProfileId();
      if (!selectedId && stored && profiles.some(p => p.id === stored)) {
        selectedId = stored;
      }
      // cargar RDAs del perfil activo
      if (selectedId) await loadProfileRDAs(selectedId as string);
    } catch (e: any) {
      const msg = e?.message ?? 'No se pudieron cargar los perfiles';
      error = msg;
      toasts.error(msg);
    } finally {
      loading = false;
    }
  }

  async function loadProfileRDAs(profileId: string) {
    try {
      rdaLoading = true;
      rdaValues = {};
      rdaUnits = {};
      recommendedRDA = {};
      const { data, error: err } = await supabase
        .from('UserProfileRDA')
        .select('nutrient, value, unit')
        .eq('userProfileId', profileId);
      if (err) throw err;
      const existingKeys = new Set<string>();
      for (const row of data || []) {
        const k = String((row as any).nutrient);
        rdaValues[k] = Number((row as any).value) || 0;
        rdaUnits[k] = String((row as any).unit) || '';
        existingKeys.add(k);
      }

      // Completar con valores recomendados por defecto (según edad/sexo) para claves faltantes
      let profMeta = profiles.find(p => p.id === profileId) || null;
      if (!profMeta) {
        const { data: p, error: pErr } = await supabase
          .from('UserProfile')
          .select('id, age, sex')
          .eq('id', profileId)
          .single();
        if (!pErr && p) profMeta = p as any;
      }
      if (profMeta) {
        const ageGroup = computeAgeGroup(profMeta.age);
        let recs: any[] = [];
        try {
          const { data, error } = await supabase
            .from('RecommendedDailyAllowance')
            .select('nutrient, value, unit, sex')
            .eq('ageGroup', ageGroup)
            .or(`sex.eq.${profMeta.sex},sex.is.null`);
          if (error) throw error;
          recs = data || [];
        } catch (e: any) {
          toasts.error(`No se pudieron cargar RDAs por defecto: ${e?.message || e}`);
          recs = [];
        }
        const pickMap = new Map<string, { value: number; unit: string; sex: string | null }>();
        for (const r of recs) {
          const key = String((r as any).nutrient);
          const unit = String((r as any).unit || '');
          const sex = (r as any).sex ?? null;
          if (!pickMap.has(key) || (!pickMap.get(key)!.sex && sex)) {
            pickMap.set(key, { value: Number((r as any).value) || 0, unit, sex });
          }
        }
        // Para cada nutriente esperado, si no existe o su valor actual es 0, usar recomendado para mostrar
        for (const { key, unit } of [...VITAMINS, ...MINERALS, ...EXTRA]) {
          const rec = pickMap.get(key);
          if (rec && rec.value > 0) {
            recommendedRDA[key] = { value: rec.value, unit: rec.unit || unit };
          }
          const exists = existingKeys.has(key);
          const currentVal = Number(rdaValues[key] ?? 0);
          if (!exists || !(currentVal > 0)) {
            if (rec && rec.value > 0) {
              rdaValues[key] = rec.value;
              rdaUnits[key] = rec.unit || unit;
            } else {
              if (!rdaUnits[key]) rdaUnits[key] = unit;
              if (rdaValues[key] == null) rdaValues[key] = 0;
            }
          } else {
            // Existe y > 0: solo asegurar unidad
            if (!rdaUnits[key]) rdaUnits[key] = rec?.unit || unit;
          }
        }
      }

      // Asegurar unidades por defecto para cualquier clave faltante
      [...VITAMINS, ...MINERALS, ...EXTRA].forEach(({ key, unit }) => { if (!rdaUnits[key]) rdaUnits[key] = unit; if (rdaValues[key] == null) rdaValues[key] = 0; });
    } catch (e: any) {
      toasts.error(e?.message ?? 'No se pudieron cargar los RDAs del perfil');
    } finally {
      rdaLoading = false;
    }
  }

  async function startCreate() {
    selectedId = null;
    writeActiveProfileId(null);
    formName = '';
    formAge = '';
    formSex = '';
    formMacroProtein = '';
    formMacroCarbs = '';
    formMacroFat = '';
    rdaValues = {};
    rdaUnits = {};
    recommendedRDA = {};
    isEdit = false;
    step = 1;
    viewNonce++;
    toasts.info('Nuevo perfil: Paso 1');
    await tick();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }

  async function startEdit(profile: Profile) {
    // Setear primero el contexto del perfil
    selectedId = profile.id;
    formName = profile.name;
    formAge = profile.age as any;
    formSex = profile.sex;
    formMacroProtein = (profile.macroProtein ?? '') as any;
    formMacroCarbs = (profile.macroCarbs ?? '') as any;
    formMacroFat = (profile.macroFat ?? '') as any;
    // Cambiar vista y forzar re-render inmediato
    isEdit = true;
    step = 2;
    toasts.success(`Editor abierto para "${profile.name}"`);
    await tick();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    // Cargar RDAs del perfil (asíncrono, sin bloquear cambio de vista)
    await loadProfileRDAs(profile.id);
  }

  async function saveProfile(skipReload: boolean = false) {
    try {
      saving = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toasts.error('No hay sesión'); return; }
      const ageNum = typeof formAge === 'number' ? formAge : Number(formAge);
      if (!formName.trim() || !ageNum || ageNum < 1 || ageNum > 120 || (formSex !== 'MALE' && formSex !== 'FEMALE')) {
        toasts.error('Datos inválidos');
        return;
      }
      const payload: any = {
        userId: session.user.id,
        name: formName.trim(),
        age: ageNum,
        sex: formSex,
        macroProtein: formMacroProtein === '' ? null : Number(formMacroProtein),
        macroCarbs: formMacroCarbs === '' ? null : Number(formMacroCarbs),
        macroFat: formMacroFat === '' ? null : Number(formMacroFat),
      };
      if (isEdit && selectedId) {
        const { data, error } = await supabase
          .from('UserProfile')
          .update({ ...payload, updatedAt: new Date().toISOString() })
          .eq('id', selectedId)
          .select('id')
          .single();
        if (error) throw error;
        toasts.success('Perfil actualizado');
      } else {
        const { data, error } = await supabase
          .from('UserProfile')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        selectedId = (data as any)?.id ?? null;
        writeActiveProfileId(selectedId);
        // Sembrar RDAs por defecto para el nuevo perfil (no sobrescribe si ya existen)
        if (selectedId) {
          try {
            const { error: rpcErr } = await supabase.rpc('seed_user_profile_rda', { profile_id: selectedId });
            if (rpcErr) {
              toasts.error(`No se pudieron inicializar los RDAs por defecto: ${rpcErr.message}`);
            }
          } catch (e: any) {
            toasts.error(e?.message ?? 'No se pudieron inicializar los RDAs por defecto');
          }
        }
        toasts.success('Perfil creado');
      }
      if (!skipReload) {
        await loadProfiles();
      }
    } catch (e: any) {
      toasts.error(e?.message ?? 'No se pudo guardar el perfil');
    } finally {
      saving = false;
    }
  }

  async function deleteProfile(profile: Profile) {
    const ok = confirm(`¿Eliminar el perfil "${profile.name}"?`);
    if (!ok) return;
    try {
      const { error } = await supabase
        .from('UserProfile')
        .delete()
        .eq('id', profile.id);
      if (error) throw error;
      toasts.success('Perfil eliminado');
      if (selectedId === profile.id) {
        selectedId = null;
        writeActiveProfileId(null);
      }
      await loadProfiles();
    } catch (e: any) {
      toasts.error(e?.message ?? 'No se pudo eliminar el perfil');
    }
  }

  async function saveRDAs() {
    if (!selectedId) return;
    try {
      rdaSaving = true;
      // Leer existentes para detectar eliminaciones
      const { data: existing, error: exErr } = await supabase
        .from('UserProfileRDA')
        .select('nutrient')
        .eq('userProfileId', selectedId);
      if (exErr) throw exErr;
      const existingKeys = new Set((existing || []).map((r: any) => r.nutrient));

      const upserts: Array<{ userProfileId: string; nutrient: string; value: number; unit: string }> = [];
      const keeps = new Set<string>();
      for (const { key } of [...VITAMINS, ...MINERALS, ...EXTRA]) {
        const v = Number(rdaValues[key] ?? 0);
        const u = rdaUnits[key] || '';
        if (v > 0) {
          upserts.push({ userProfileId: selectedId, nutrient: key, value: v, unit: u });
          keeps.add(key);
        }
      }
      // Añadir 'calories' (kcal) calculadas desde macros del formulario si corresponde
      const cal = Math.round((Number(formMacroProtein || 0) * 4) + (Number(formMacroCarbs || 0) * 4) + (Number(formMacroFat || 0) * 9));
      if (!isNaN(cal) && cal > 0) {
        upserts.push({ userProfileId: selectedId, nutrient: 'calories', value: cal, unit: 'kcal' });
        keeps.add('calories');
      }
      if (upserts.length > 0) {
        const { error: upErr } = await supabase
          .from('UserProfileRDA')
          .upsert(upserts as any, { onConflict: 'userProfileId,nutrient' });
        if (upErr) throw upErr;
      }
      // Eliminar las que estaban y ahora quedaron en 0
      const toDelete = [...existingKeys].filter(k => !keeps.has(k));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('UserProfileRDA')
          .delete()
          .eq('userProfileId', selectedId)
          .in('nutrient', toDelete);
        if (delErr) throw delErr;
      }
      toasts.success('RDAs del perfil guardados');
    } catch (e: any) {
      toasts.error(e?.message ?? 'No se pudieron guardar los RDAs');
    } finally {
      rdaSaving = false;
    }
  }

  async function selectProfile(id: string) {
    toasts.info(`Abriendo perfil seleccionado…`);
    selectedId = id;
    writeActiveProfileId(id);
    const found = profiles.find(p => p.id === id);
    if (found) {
      // Avanzar de inmediato a Paso 2 para feedback instantáneo
      isEdit = true;
      step = 2;
      viewNonce++;
      await tick();
      // Completar datos básicos mientras se carga RDAs
      formName = found.name;
      formAge = found.age as any;
      formSex = found.sex;
      formMacroProtein = (found.macroProtein ?? '') as any;
      formMacroCarbs = (found.macroCarbs ?? '') as any;
      formMacroFat = (found.macroFat ?? '') as any;
      // Disparar carga de RDAs sin bloquear el re-render
      startEdit(found);
    } else {
      toasts.error('Perfil no encontrado');
    }
  }

  onMount(async () => {
    const hasAccess = await requireSubscription();
    if (!hasAccess) return;

    await loadProfiles();
    // Estado inicial explícito: Paso 1 y sin edición
    isEdit = false;
    step = 1;
  });
</script>

<svelte:head>
  <title>Perfiles y RDAs personalizados | Nutri-Track</title>
</svelte:head>

<div class="p-4 max-w-4xl mx-auto bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl sm:text-2xl font-bold">Perfiles y RDAs personalizados</h1>
    <a
      href="/dashboard"
      class="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      Volver al panel principal
    </a>
  </div>

  {#if loading}
    <p class="text-gray-500">Cargando…</p>
  {:else}
    <div class="grid md:grid-cols-3 gap-4">
      <section class="md:col-span-1 border rounded p-3 dark:border-gray-800">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold">Perfiles</h2>
          <button type="button" class="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-500" onclick={startCreate}>Crear nuevo perfil</button>
        </div>
        {#if profiles.length === 0}
          <p class="text-sm text-gray-500">Aún no hay perfiles</p>
        {:else}
          <ul class="space-y-4">
            {#each profiles as p}
              <li class="flex items-center justify-between gap-3">
                <button type="button" class="flex-1 text-left truncate hover:underline" onclick={() => selectProfile(p.id)}>{p.name}</button>
                <button type="button" class="px-2 py-1 text-xs rounded bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100" onclick={() => selectProfile(p.id)}>Editar</button>
                <button type="button" class="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-500" onclick={() => deleteProfile(p)}>Eliminar</button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="md:col-span-2 border rounded p-3 dark:border-gray-800">
        {#key viewNonce}
        <h2 class="text-lg font-semibold mb-2">{isEdit ? 'Editar perfil' : ((!isEdit && step === 1) ? 'Nuevo perfil · Paso 1' : 'Nuevo perfil · Paso 2')}</h2>
        {#if !isEdit && step === 1}
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1" for="formAge">Edad</label>
              <input id="formAge" type="number" min="1" max="120" step="1" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={formAge === '' ? '' : String(formAge)} oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); formAge = isNaN(v) ? '' : Math.round(v); }} />
            </div>
            <div>
              <label class="block text-sm mb-1" for="formSex">Sexo</label>
              <select id="formSex" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={formSex as any}>
                <option value="" disabled>Selecciona…</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
            </div>
          </div>
          <div class="mt-4 flex gap-3">
            <button type="button" class="px-3 py-2 rounded bg-blue-600 text-white text-sm" onclick={async () => { const a = typeof formAge === 'number' ? formAge : Number(formAge); if (!a || a < 1 || a > 120 || (formSex !== 'MALE' && formSex !== 'FEMALE')) { toasts.error('Completa edad y sexo válidos'); return; } toasts.info('Avanzando a Paso 2…'); step = 2; viewNonce++; await tick(); await prefillFromAgeSex(a, formSex as Sex); }}>Siguiente</button>
            <button type="button" class="px-3 py-2 rounded bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 text-sm" onclick={startCreate}>Reiniciar</button>
          </div>
        {:else}
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1" for="formName">Nombre</label>
              <input id="formName" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={formName} placeholder="Ej: Carlos" />
            </div>
            {#if isEdit}
              <div>
                <label class="block text-sm mb-1" for="formAgeEdit">Edad</label>
                <input id="formAgeEdit" type="number" min="1" max="120" step="1" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={formAge === '' ? '' : String(formAge)} oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); formAge = isNaN(v) ? '' : Math.round(v); }} />
              </div>
              <div>
                <label class="block text-sm mb-1" for="formSexEdit">Sexo</label>
                <select id="formSexEdit" class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" bind:value={formSex as any}>
                  <option value="" disabled>Selecciona…</option>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </div>
            {/if}
            <div class="grid grid-cols-3 gap-3 sm:col-span-2">
              <div>
                <label class="block text-xs mb-1" for="macroProtein">Proteínas (g/d)</label>
                <input id="macroProtein" type="number" min="0" step="1" class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={formMacroProtein === '' ? '' : String(formMacroProtein)} oninput={(e) => { const el = e.currentTarget as HTMLInputElement; const v = el.valueAsNumber; formMacroProtein = el.value === '' ? '' : (Number.isFinite(v) ? v : ''); }} />
              </div>
              <div>
                <label class="block text-xs mb-1" for="macroCarbs">Carbohidratos (g/d)</label>
                <input id="macroCarbs" type="number" min="0" step="1" class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={formMacroCarbs === '' ? '' : String(formMacroCarbs)} oninput={(e) => { const el = e.currentTarget as HTMLInputElement; const v = el.valueAsNumber; formMacroCarbs = el.value === '' ? '' : (Number.isFinite(v) ? v : ''); }} />
              </div>
              <div>
                <label class="block text-xs mb-1" for="macroFat">Grasas (g/d)</label>
                <input id="macroFat" type="number" min="0" step="1" class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={formMacroFat === '' ? '' : String(formMacroFat)} oninput={(e) => { const el = e.currentTarget as HTMLInputElement; const v = el.valueAsNumber; formMacroFat = el.value === '' ? '' : (Number.isFinite(v) ? v : ''); }} />
              </div>
            </div>
            <div class="sm:col-span-2 mt-1 text-sm">
              <span class="text-gray-700 dark:text-gray-300">Calorías objetivo (estimado): </span>
              <span class="font-semibold">{computedProfileCalories} kcal</span>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs mb-1" for="fiber">Fibra (g/d)</label>
              <input
                id="fiber"
                type="number"
                min="0"
                step="0.1"
                class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                value={rdaValues['fiber'] === '' ? '' : String(rdaValues['fiber'] ?? 0)}
                placeholder={recommendedRDA['fiber']?.value ? String(recommendedRDA['fiber'].value) : undefined}
                oninput={(e) => {
                  const val = (e.currentTarget as HTMLInputElement).value;
                  if (val === '') {
                    rdaValues = { ...rdaValues, fiber: '' as any };
                  } else {
                    const n = Number(val);
                    rdaValues = { ...rdaValues, fiber: isNaN(n) || n < 0 ? 0 : n };
                  }
                  rdaUnits['fiber'] = 'g';
                }}
              />
            </div>
            <div class="sm:col-span-2 mt-2">
              <div class="grid sm:grid-cols-2 gap-x-4 gap-y-8">
                <div>
                  <h3 class="font-medium mb-1">Vitaminas</h3>
                  <div class="grid grid-cols-2 gap-2">
                    {#each VITAMINS as v}
                      <div>
                        <label class="block text-xs mb-1" for={`vit-${v.key}`}>{v.label} ({rdaUnits[v.key] || v.unit})</label>
                        <input
                          id={`vit-${v.key}`}
                          type="number"
                          min="0"
                          step="0.1"
                          class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                          value={rdaValues[v.key] === '' ? '' : String(rdaValues[v.key] ?? 0)}
                          placeholder={recommendedRDA[v.key]?.value ? String(recommendedRDA[v.key].value) : undefined}
                          oninput={(e) => {
                            const val = (e.currentTarget as HTMLInputElement).value;
                            if (val === '') {
                              rdaValues = { ...rdaValues, [v.key]: '' as any };
                            } else {
                              const n = Number(val);
                              rdaValues = { ...rdaValues, [v.key]: isNaN(n) || n < 0 ? 0 : n };
                            }
                          }}
                        />
                      </div>
                    {/each}
                  </div>
                </div>
                <div>
                  <h3 class="font-medium mb-1">Minerales</h3>
                  <div class="grid grid-cols-2 gap-2">
                    {#each MINERALS as m}
                      <div>
                        <label class="block text-xs mb-1" for={`min-${m.key}`}>{m.label} ({rdaUnits[m.key] || m.unit})</label>
                        <input
                          id={`min-${m.key}`}
                          type="number"
                          min="0"
                          step="0.1"
                          class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                          value={rdaValues[m.key] === '' ? '' : String(rdaValues[m.key] ?? 0)}
                          placeholder={recommendedRDA[m.key]?.value ? String(recommendedRDA[m.key].value) : undefined}
                          oninput={(e) => {
                            const val = (e.currentTarget as HTMLInputElement).value;
                            if (val === '') {
                              rdaValues = { ...rdaValues, [m.key]: '' as any };
                            } else {
                              const n = Number(val);
                              rdaValues = { ...rdaValues, [m.key]: isNaN(n) || n < 0 ? 0 : n };
                            }
                          }}
                        />
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-4">
          <button type="button" class="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60" onclick={saveAll} disabled={saving}>{isEdit ? 'Guardar cambios' : 'Guardar perfil y RDAs'}</button>
        </div>
        {/if}
        {/key}
      </section>
    </div>

  {/if}
</div>
