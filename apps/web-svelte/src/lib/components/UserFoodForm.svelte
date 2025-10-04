<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { toasts } from '$lib/stores/toast';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ created: { id: string; name: string }, updated: { id: string; name: string }, cancel: void }>();

  let { foodId = null } = $props<{ foodId?: string | null }>();
  const isEdit = $derived(!!foodId);
  let loadingExisting = $state(false);

  let name = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  type NumMap = Record<string, number>;

  // Defaults: grams for macros/fiber, mg for most vitamins/minerals, µg for a few
  const macros: Array<{ key: string; label: string; unit: 'g' }> = [
    { key: 'protein', label: 'Proteína (g)', unit: 'g' },
    { key: 'carbohydrates', label: 'Carbohidratos (g)', unit: 'g' },
    { key: 'fat', label: 'Grasa (g)', unit: 'g' },
    { key: 'fiber', label: 'Fibra (g)', unit: 'g' }
  ];

  const vitamins: Array<{ key: string; label: string; unit: 'mg' | 'µg' }> = [
    { key: 'vitaminA', label: 'Vitamina A (µg)', unit: 'µg' },
    { key: 'vitaminC', label: 'Vitamina C (mg)', unit: 'mg' },
    { key: 'vitaminD', label: 'Vitamina D (µg)', unit: 'µg' },
    { key: 'vitaminE', label: 'Vitamina E (mg)', unit: 'mg' },
    { key: 'vitaminK', label: 'Vitamina K (µg)', unit: 'µg' },
    { key: 'vitaminB1', label: 'Vitamina B1 (mg)', unit: 'mg' },
    { key: 'vitaminB2', label: 'Vitamina B2 (mg)', unit: 'mg' },
    { key: 'vitaminB3', label: 'Vitamina B3 (mg)', unit: 'mg' },
    { key: 'vitaminB5', label: 'Vitamina B5 (mg)', unit: 'mg' },
    { key: 'vitaminB6', label: 'Vitamina B6 (mg)', unit: 'mg' },
    { key: 'vitaminB7', label: 'Vitamina B7 (µg)', unit: 'µg' },
    { key: 'vitaminB12', label: 'Vitamina B12 (µg)', unit: 'µg' },
    { key: 'folate', label: 'Folato (µg)', unit: 'µg' },
    { key: 'choline', label: 'Colina (mg)', unit: 'mg' }
  ];

  const minerals: Array<{ key: string; label: string; unit: 'mg' | 'µg' }> = [
    { key: 'calcium', label: 'Calcio (mg)', unit: 'mg' },
    { key: 'iron', label: 'Hierro (mg)', unit: 'mg' },
    { key: 'magnesium', label: 'Magnesio (mg)', unit: 'mg' },
    { key: 'zinc', label: 'Zinc (mg)', unit: 'mg' },
    { key: 'potassium', label: 'Potasio (mg)', unit: 'mg' },
    { key: 'sodium', label: 'Sodio (mg)', unit: 'mg' },
    { key: 'phosphorus', label: 'Fósforo (mg)', unit: 'mg' },
    { key: 'selenium', label: 'Selenio (µg)', unit: 'µg' },
    { key: 'copper', label: 'Cobre (mg)', unit: 'mg' },
    { key: 'manganese', label: 'Manganeso (mg)', unit: 'mg' },
    { key: 'iodine', label: 'Yodo (µg)', unit: 'µg' },
    { key: 'chloride', label: 'Cloruro (mg)', unit: 'mg' }
  ];
  const macroKeys = new Set(macros.map((m) => m.key));
  const vitaminKeys = new Set(vitamins.map((v) => v.key));
  const mineralKeys = new Set(minerals.map((m) => m.key));

  let macroValues: NumMap = $state(Object.fromEntries(macros.map(m => [m.key, 0])) as NumMap);
  let vitaminValues: NumMap = $state(Object.fromEntries(vitamins.map(v => [v.key, 0])) as NumMap);
  let mineralValues: NumMap = $state(Object.fromEntries(minerals.map(m => [m.key, 0])) as NumMap);

  // Cálculo en tiempo real de calorías por 100 g (4/4/9)
  const computedCalories = $derived(
    Math.round(
      toNumberSafe(macroValues['protein']) * 4 +
      toNumberSafe(macroValues['carbohydrates']) * 4 +
      toNumberSafe(macroValues['fat']) * 9
    )
  );

  function toNumberSafe(v: string | number): number {
    const n = typeof v === 'number' ? v : Number(v);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  async function loadExistingFood() {
    try {
      if (!foodId) return;
      loadingExisting = true;
      error = null;
      const { data: uf, error: ufErr } = await supabase
        .from('UserFood')
        .select('id, name')
        .eq('id', foodId)
        .single();
      if (ufErr || !uf) {
        error = ufErr?.message ?? 'No se encontró el alimento';
        toasts.error(error ?? 'Error');
        return;
      }
      name = uf.name ?? '';

      const { data: rows, error: nErr } = await supabase
        .from('UserFoodNutrient')
        .select('nutrient, value, unit')
        .eq('userFoodId', foodId);
      if (nErr) {
        error = nErr.message;
        toasts.error(error ?? 'Error');
        return;
      }
      // Reset y luego completar con lo existente
      macroValues = Object.fromEntries(macros.map(m => [m.key, 0])) as NumMap;
      vitaminValues = Object.fromEntries(vitamins.map(v => [v.key, 0])) as NumMap;
      mineralValues = Object.fromEntries(minerals.map(m => [m.key, 0])) as NumMap;
      for (const r of rows ?? []) {
        if (macroKeys.has(r.nutrient)) {
          macroValues = { ...macroValues, [r.nutrient]: toNumberSafe(r.value) };
        } else if (vitaminKeys.has(r.nutrient)) {
          vitaminValues = { ...vitaminValues, [r.nutrient]: toNumberSafe(r.value) };
        } else if (mineralKeys.has(r.nutrient)) {
          mineralValues = { ...mineralValues, [r.nutrient]: toNumberSafe(r.value) };
        }
      }
    } finally {
      loadingExisting = false;
    }
  }

  $effect(() => {
    if (foodId) {
      loadExistingFood();
    }
  });

  async function save() {
    try {
      error = null;
      if (!name.trim()) {
        error = 'Ingresa un nombre';
        return;
      }
      saving = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        error = 'No hay sesión';
        saving = false;
        return;
      }
      if (isEdit && foodId) {
        // 1) Actualiza UserFood (nombre)
        const { data: ufUpd, error: ufUpdErr } = await supabase
          .from('UserFood')
          .update({ name: name.trim(), updatedAt: new Date().toISOString() })
          .eq('id', foodId)
          .select('id, name')
          .single();

        if (ufUpdErr || !ufUpd) {
          const code = (ufUpdErr as any)?.code;
          if (code === '23505') {
            error = 'Ya tienes un alimento con ese nombre';
          } else {
            error = ufUpdErr?.message || 'No se pudo actualizar el alimento';
          }
          toasts.error(error ?? 'Error');
          saving = false;
          return;
        }

        // 2) Construye nutrientes (>0)
        const nutrients: Array<{ userFoodId: string; nutrient: string; value: number; unit: string }> = [];
        for (const m of macros) {
          const v = toNumberSafe(macroValues[m.key]);
          if (v > 0) nutrients.push({ userFoodId: ufUpd.id, nutrient: m.key, value: v, unit: m.unit });
        }
        for (const v of vitamins) {
          const val = toNumberSafe(vitaminValues[v.key]);
          if (val > 0) nutrients.push({ userFoodId: ufUpd.id, nutrient: v.key, value: val, unit: v.unit });
        }
        for (const m of minerals) {
          const val = toNumberSafe(mineralValues[m.key]);
          if (val > 0) nutrients.push({ userFoodId: ufUpd.id, nutrient: m.key, value: val, unit: m.unit });
        }

        // 3) Incluir calorías (kcal) calculadas por 100 g
        {
          const kcal = Math.round(toNumberSafe(macroValues['protein']) * 4 + toNumberSafe(macroValues['carbohydrates']) * 4 + toNumberSafe(macroValues['fat']) * 9);
          if (kcal > 0) nutrients.push({ userFoodId: ufUpd.id, nutrient: 'calories', value: kcal, unit: 'kcal' });
        }

        // 4) Elimina nutrientes no presentes
        const { data: existingRows, error: exErr } = await supabase
          .from('UserFoodNutrient')
          .select('nutrient')
          .eq('userFoodId', ufUpd.id);
        if (exErr) {
          error = exErr.message;
          toasts.error(error ?? 'Error');
          saving = false;
          return;
        }
        const newKeys = new Set(nutrients.map(n => n.nutrient));
        const existingKeys = new Set((existingRows ?? []).map(r => r.nutrient));
        const toDelete = [...existingKeys].filter(k => !newKeys.has(k));
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('UserFoodNutrient')
            .delete()
            .eq('userFoodId', ufUpd.id)
            .in('nutrient', toDelete);
          if (delErr) {
            error = delErr.message;
            toasts.error(`No se pudieron eliminar nutrientes: ${delErr.message}`);
            saving = false;
            return;
          }
        }

        // 5) Upsert de nutrientes actuales
        if (nutrients.length > 0) {
          const { error: upsertErr } = await supabase
            .from('UserFoodNutrient')
            .upsert(nutrients as any, { onConflict: 'userFoodId,nutrient' });
          if (upsertErr) {
            error = upsertErr.message;
            toasts.error(`No se pudieron guardar los nutrientes: ${upsertErr.message}`);
            saving = false;
            return;
          }
        }

        toasts.success('Alimento actualizado');
        dispatch('updated', ufUpd);
        saving = false;
      } else {
        // CREAR
        const { data: uf, error: ufErr } = await supabase
          .from('UserFood')
          .insert({ name: name.trim(), userId: session.user.id })
          .select('id, name')
          .single();

        if (ufErr || !uf) {
          const code = (ufErr as any)?.code;
          if (code === '23505') {
            error = 'Ya tienes un alimento con ese nombre';
          } else {
            error = ufErr?.message || 'No se pudo crear el alimento';
          }
          toasts.error(error ?? 'Error');
          saving = false;
          return;
        }

        const nutrients: Array<{ userFoodId: string; nutrient: string; value: number; unit: string }> = [];
        for (const m of macros) {
          const v = toNumberSafe(macroValues[m.key]);
          if (v > 0) nutrients.push({ userFoodId: uf.id, nutrient: m.key, value: v, unit: m.unit });
        }
        for (const v of vitamins) {
          const val = toNumberSafe(vitaminValues[v.key]);
          if (val > 0) nutrients.push({ userFoodId: uf.id, nutrient: v.key, value: val, unit: v.unit });
        }
        for (const m of minerals) {
          const val = toNumberSafe(mineralValues[m.key]);
          if (val > 0) nutrients.push({ userFoodId: uf.id, nutrient: m.key, value: val, unit: m.unit });
        }

        // Incluir calorías (kcal) por 100 g
        {
          const kcal = Math.round(toNumberSafe(macroValues['protein']) * 4 + toNumberSafe(macroValues['carbohydrates']) * 4 + toNumberSafe(macroValues['fat']) * 9);
          if (kcal > 0) nutrients.push({ userFoodId: uf.id, nutrient: 'calories', value: kcal, unit: 'kcal' });
        }

        if (nutrients.length > 0) {
          const { error: nErr } = await supabase
            .from('UserFoodNutrient')
            .insert(nutrients);
          if (nErr) {
            // Cleanup UserFood if nutrient insert fails
            await supabase.from('UserFood').delete().eq('id', uf.id);
            error = nErr.message;
            toasts.error(`No se pudieron guardar los nutrientes: ${nErr.message}`);
            saving = false;
            return;
          }
        }

        toasts.success('Alimento personalizado creado');
        dispatch('created', uf);

        // reset
        name = '';
        macroValues = Object.fromEntries(macros.map(m => [m.key, 0])) as NumMap;
        vitaminValues = Object.fromEntries(vitamins.map(v => [v.key, 0])) as NumMap;
        mineralValues = Object.fromEntries(minerals.map(m => [m.key, 0])) as NumMap;
        saving = false;
      }
    } catch (e: any) {
      saving = false;
      error = e?.message ?? 'Error desconocido';
      toasts.error(error ?? 'Error');
    }
  }
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
  <h4 class="text-base font-semibold mb-3">{isEdit ? 'Editar alimento personalizado' : 'Nuevo alimento personalizado'}</h4>
  <div class="space-y-3">
    <div>
      <label class="block text-sm mb-1" for="userfood-name">Nombre</label>
      <input
        id="userfood-name"
        class="w-full border rounded px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        type="text"
        placeholder="Ej: Avena cocida"
        bind:value={name}
      />
    </div>

    <div>
      <h5 class="text-sm font-medium mb-2">Macronutrientes y fibra (por 100 g)</h5>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each macros as m}
          <div>
            <label class="block text-xs mb-1" for={`macro-${m.key}`}>{m.label}</label>
            <input
              id={`macro-${m.key}`}
              class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              type="number" min="0" step="0.1"
              value={macroValues[m.key]}
              oninput={(e) => macroValues = { ...macroValues, [m.key]: Number((e.currentTarget as HTMLInputElement).value) }}
            />
          </div>
        {/each}
      </div>
      <div class="mt-2 text-sm">
        <span class="text-gray-700 dark:text-gray-300">Calorías estimadas (por 100 g): </span>
        <span class="font-semibold">{computedCalories} kcal</span>
      </div>
    </div>

    <div>
      <h5 class="text-sm font-medium mb-2">Vitaminas (por 100 g)</h5>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each vitamins as v}
          <div>
            <label class="block text-xs mb-1" for={`vit-${v.key}`}>{v.label}</label>
            <input
              id={`vit-${v.key}`}
              class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              type="number" min="0" step="0.1"
              value={vitaminValues[v.key]}
              oninput={(e) => vitaminValues = { ...vitaminValues, [v.key]: Number((e.currentTarget as HTMLInputElement).value) }}
            />
          </div>
        {/each}
      </div>
    </div>

    <div>
      <h5 class="text-sm font-medium mb-2">Minerales (por 100 g)</h5>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each minerals as m}
          <div>
            <label class="block text-xs mb-1" for={`min-${m.key}`}>{m.label}</label>
            <input
              id={`min-${m.key}`}
              class="w-full border rounded px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              type="number" min="0" step="0.1"
              value={mineralValues[m.key]}
              oninput={(e) => mineralValues = { ...mineralValues, [m.key]: Number((e.currentTarget as HTMLInputElement).value) }}
            />
          </div>
        {/each}
      </div>
    </div>

    {#if error}
      <p class="text-sm text-red-600">{error}</p>
    {/if}

    <div class="flex flex-wrap gap-3">
      <button class="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm" onclick={() => dispatch('cancel')} disabled={saving || loadingExisting}>Cancelar</button>
      <button class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-60" onclick={save} disabled={saving || loadingExisting}>{isEdit ? 'Actualizar' : 'Guardar'}</button>
    </div>
  </div>
</div>
