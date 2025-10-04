<script lang="ts">
  type SummaryItem = {
    nutrient: string;
    total: number;
    unit: string;
    rda: number;
    percentage: number;
  };

  let { summary = [] as SummaryItem[] } = $props();

  const formatNumber = (num: number) => parseFloat((num ?? 0).toFixed(1));

  const MACRO_CONFIG = [
    { key: 'protein', label: 'Proteína', color: 'bg-blue-600', unit: 'g' },
    { key: 'carbohydrates', label: 'Hidratos', color: 'bg-yellow-500', unit: 'g' },
    { key: 'fat', label: 'Grasa', color: 'bg-pink-600', unit: 'g' },
    { key: 'fiber', label: 'Fibra', color: 'bg-green-700', unit: 'g' }
  ] as const;

  const VITAMINS = [
    'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
    'vitaminB1', 'vitaminB2', 'vitaminB3', 'vitaminB5', 'vitaminB6', 'vitaminB7', 'vitaminB12', 'folate',
    'choline'
  ] as const;

  const MINERALS = [
    'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'sodium', 'phosphorus', 'selenium', 'copper', 'manganese', 'iodine',
    'chloride'
  ] as const;

  const NUTRIENT_LABELS: Record<string, string> = {
    vitamina: 'Vitamina A',
    vitaminc: 'Vitamina C',
    vitamind: 'Vitamina D',
    vitamine: 'Vitamina E',
    vitamink: 'Vitamina K',
    vitaminb1: 'Vitamina B1',
    vitaminb2: 'Vitamina B2',
    vitaminb3: 'Vitamina B3',
    vitaminb5: 'Vitamina B5',
    vitaminb7: 'Vitamina B7',
    vitaminb6: 'Vitamina B6',
    vitaminb12: 'Vitamina B12',
    folate: 'Vitamina B9 (Folato)',
    choline: 'Colina',
    calcium: 'Calcio',
    iron: 'Hierro',
    magnesium: 'Magnesio',
    zinc: 'Zinc',
    potassium: 'Potasio',
    sodium: 'Sodio',
    phosphorus: 'Fósforo',
    selenium: 'Selenio',
    copper: 'Cobre',
    manganese: 'Manganeso',
    iodine: 'Yodo',
    chloride: 'Cloruro'
  };

  // Helpers
  const computePct = (total: number, rda: number) => (rda > 0 ? (total / rda) * 100 : 0);
  const clampPct = (p: number) => Math.max(0, Math.min(100, p));

  // Mapa para acceso rápido por clave en minúsculas
  const summaryMap = $derived((summary || []).reduce((acc, item) => {
    acc[item.nutrient?.toLowerCase?.() ?? ''] = item;
    return acc;
  }, {} as Record<string, SummaryItem>));

  const totalCalories = $derived(summaryMap.calories?.total || 0);
  const targetCalories = $derived(summaryMap.calories?.rda || 0);
</script>

{#if !summary || summary.length === 0}
  <div class="rounded border border-gray-200 dark:border-gray-800 p-4">
    <h2 class="text-lg font-semibold mb-2">Resumen del Día</h2>
    <p class="text-sm text-gray-500">No hay datos de consumo para mostrar.</p>
  </div>
{:else}
  <div class="space-y-14 sm:space-y-12">
    <section>
      <h2 class="text-lg font-semibold mb-4">Macronutrientes y Fibra</h2>
      <div class="grid gap-4 md:grid-cols-2">
        {#each MACRO_CONFIG as { key, label, color, unit }}
          {#key key}
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span class="font-medium">{label}</span>
                <span class="w-full sm:w-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {formatNumber(summaryMap[key]?.total || 0)} / {formatNumber(summaryMap[key]?.rda || 0)} {unit}
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">({Math.round(computePct(summaryMap[key]?.total || 0, summaryMap[key]?.rda || 0))}%)</span>
                </span>
              </div>
              <!-- Barra de progreso -->
              <div
                class="w-full h-2.5 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={summaryMap[key]?.rda || 0}
                aria-valuenow={summaryMap[key]?.total || 0}
                aria-valuetext={`${formatNumber(summaryMap[key]?.total || 0)} / ${formatNumber(summaryMap[key]?.rda || 0)} ${unit} (${Math.round(computePct(summaryMap[key]?.total || 0, summaryMap[key]?.rda || 0))}%)`}
                title={`${formatNumber(summaryMap[key]?.total || 0)} / ${formatNumber(summaryMap[key]?.rda || 0)} ${unit} (${Math.round(computePct(summaryMap[key]?.total || 0, summaryMap[key]?.rda || 0))}% )`}
              >
                <div
                  class={`h-2.5 ${computePct(summaryMap[key]?.total || 0, summaryMap[key]?.rda || 0) >= 100 ? 'bg-emerald-600' : color}`}
                  style={`width: ${clampPct(computePct(summaryMap[key]?.total || 0, summaryMap[key]?.rda || 0))}%;`}
                ></div>
              </div>
            </div>
          {/key}
        {/each}
      </div>
      <div class="mt-5 p-4 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <div class="flex items-baseline justify-between flex-wrap gap-y-1">
          <span class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">Calorías</span>
          <span class="text-lg sm:text-xl font-semibold">
            {formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal
          </span>
        </div>
        {#if targetCalories > 0}
          <div class="text-xs sm:text-sm text-gray-500 mt-2">({Math.round((totalCalories / targetCalories) * 100)}%)</div>
        {/if}
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-4">Vitaminas</h2>
      <div class="grid gap-3 md:grid-cols-2">
        {#each VITAMINS as key}
          {#key key}
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-1">
                <span class="capitalize">{NUTRIENT_LABELS[key.toLowerCase()] || key}</span>
                <span class="w-full sm:w-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {formatNumber((summaryMap[key.toLowerCase()]?.total) || 0)} / {formatNumber((summaryMap[key.toLowerCase()]?.rda) || 0)} {(summaryMap[key.toLowerCase()]?.unit) || ''}
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">({Math.round(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}%)</span>
                </span>
              </div>
              <div
                class="w-full h-2.5 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden"
                role="progressbar"
                aria-label={NUTRIENT_LABELS[key.toLowerCase()] || key}
                aria-valuemin={0}
                aria-valuemax={(summaryMap[key.toLowerCase()]?.rda) || 0}
                aria-valuenow={(summaryMap[key.toLowerCase()]?.total) || 0}
                aria-valuetext={`${formatNumber((summaryMap[key.toLowerCase()]?.total) || 0)} / ${formatNumber((summaryMap[key.toLowerCase()]?.rda) || 0)} ${(summaryMap[key.toLowerCase()]?.unit) || ''} (${Math.round(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}%)`}
                title={`${formatNumber((summaryMap[key.toLowerCase()]?.total) || 0)} / ${formatNumber((summaryMap[key.toLowerCase()]?.rda) || 0)} ${(summaryMap[key.toLowerCase()]?.unit) || ''} (${Math.round(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}% )`}
              >
                <div
                  class="h-2.5 bg-blue-600"
                  style={`width: ${clampPct(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}%;`}
                ></div>
              </div>
            </div>
          {/key}
        {/each}
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-4">Minerales</h2>
      <div class="grid gap-3 md:grid-cols-2">
        {#each MINERALS as key}
          {#key key}
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-1">
                <span class="capitalize">{NUTRIENT_LABELS[key.toLowerCase()] || key}</span>
                <span class="w-full sm:w-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {formatNumber((summaryMap[key.toLowerCase()]?.total) || 0)} / {formatNumber((summaryMap[key.toLowerCase()]?.rda) || 0)} {(summaryMap[key.toLowerCase()]?.unit) || ''}
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">({Math.round(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}%)</span>
                </span>
              </div>
              <div
                class="w-full h-2.5 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden"
                role="progressbar"
                aria-label={NUTRIENT_LABELS[key.toLowerCase()] || key}
                aria-valuemin={0}
                aria-valuemax={(summaryMap[key.toLowerCase()]?.rda) || 0}
                aria-valuenow={(summaryMap[key.toLowerCase()]?.total) || 0}
                aria-valuetext={`${formatNumber((summaryMap[key.toLowerCase()]?.total) || 0)} / ${formatNumber((summaryMap[key.toLowerCase()]?.rda) || 0)} ${(summaryMap[key.toLowerCase()]?.unit) || ''} (${Math.round(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}%)`}
                title={`${formatNumber((summaryMap[key.toLowerCase()]?.total) || 0)} / ${formatNumber((summaryMap[key.toLowerCase()]?.rda) || 0)} ${(summaryMap[key.toLowerCase()]?.unit) || ''} (${Math.round(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}% )`}
              >
                <div
                  class="h-2.5 bg-emerald-600"
                  style={`width: ${clampPct(computePct((summaryMap[key.toLowerCase()]?.total) || 0, (summaryMap[key.toLowerCase()]?.rda) || 0))}%;`}
                ></div>
              </div>
            </div>
          {/key}
        {/each}
      </div>
    </section>
  </div>
{/if}
