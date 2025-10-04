import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Logs reducidos en producción

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, Authorization, x-supabase-authorization, X-Supabase-Authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Prepare auth headers
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const xAuthHeader = req.headers.get('x-supabase-authorization') || req.headers.get('X-Supabase-Authorization') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    // priorizar x-supabase-authorization; si no está, usar Authorization solo si NO es el anon key
    const isAuthHeaderAnon = !!authHeader && authHeader.replace(/^Bearer\s+/i, '').trim() === anonKey;
    const effectiveHeader = xAuthHeader || (isAuthHeaderAnon ? '' : authHeader);
    if (!effectiveHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = effectiveHeader.replace(/^Bearer\s+/i, '').trim();
    const supabase = createClient(
      // Supabase API URL - env var exported by default when running supabase functions
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default when running supabase functions
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function. This way RLS policies are applied.
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );

    // Intentar extraer userId del JWT únicamente para depuración (RLS hará el filtrado real)
    const parseJwtSub = (jwt: string): string | null => {
      try {
        const parts = jwt.split('.')
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
        const json = atob(padded);
        const payload = JSON.parse(json);
        return typeof payload?.sub === 'string' ? payload.sub : null;
      } catch (_) {
        return null;
      }
    };
    const userId = parseJwtSub(token);
    if (userId) {
      // userId parsed
    }

    const { date, profileId } = await req.json();
    if (!date) {
      console.error('Bad request: Date is required');
      return new Response(JSON.stringify({ error: 'Date is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    // Cargar en paralelo: perfil seleccionado, perfil clásico y FoodLogs
    let selectedProfile: { id: string; name?: string; age?: number; sex?: string; macroProtein?: number; macroCarbs?: number; macroFat?: number } | null = null;
    const selectedProfilePromise = profileId
      ? supabase
          .from('UserProfile')
          .select('id, name, age, sex, "macroProtein", "macroCarbs", "macroFat"')
          .eq('id', profileId)
          .single()
      : Promise.resolve({ data: null, error: null } as any);

    let baseProfileQuery = supabase
      .from('profiles')
      .select('age, sex, "macroProtein", "macroCarbs", "macroFat"');
    if (userId) baseProfileQuery = baseProfileQuery.eq('id', userId);
    const userProfilePromise = baseProfileQuery.single();

    let flQuery = supabase
      .from('FoodLog')
      .select('id, date, quantity, foodId, userFoodId, userProfileId, Food ( id, name ), UserFood ( id, name )')
      .eq('date', date);
    if (userId) flQuery = flQuery.eq('userId', userId);
    if (profileId) {
      flQuery = flQuery.eq('userProfileId', profileId);
    } else {
      flQuery = flQuery.is('userProfileId', null);
    }
    const foodLogsPromise = flQuery;

    const [selRes, userProfRes, foodLogsRes] = await Promise.all([
      selectedProfilePromise,
      userProfilePromise,
      foodLogsPromise
    ]);
    if (!selRes?.error && selRes?.data) selectedProfile = selRes.data as any;
    const userProfile = userProfRes?.data ?? null;
    if (userProfRes?.error) {
      console.warn('Could not fetch user profile. Using default values.');
    }
    const foodLogsRaw = foodLogsRes?.data || [];
    const foodLogs = foodLogsRaw.filter((log: any) => {
      if (profileId) return log?.userProfileId === profileId;
      return !log?.userProfileId;
    });
    if (foodLogsRes?.error) {
      console.error('Error fetching food logs:', foodLogsRes.error);
      throw foodLogsRes.error;
    }

    // Usar datos de selectedProfile si existen, si no, caer a la tabla profiles
    const age = (selectedProfile?.age ?? userProfile?.age) || 30;
    const sex = (selectedProfile?.sex ?? userProfile?.sex) || 'MALE';

    const getAgeGroup = (age: number): string => {
        if (age <= 8) return '4-8';
        if (age <= 13) return '9-13';
        if (age <= 18) return '14-18';
        if (age <= 50) return '19-50';
        if (age <= 70) return '51-70';
        return '71+';
    };

    const ageGroup = getAgeGroup(age);

    // Helper: normalizar unidades a un conjunto canónico
    const normalizeUnit = (u: string | null | undefined): string => {
      if (!u) return '';
      let v = String(u).trim();
      v = v.replace('μ', 'µ'); // normaliza micro símbolo
      v = v.toLowerCase();
      if (v === 'mcg' || v === 'µg' || v === 'ug') return 'µg';
      if (v === 'mg') return 'mg';
      if (v === 'g') return 'g';
      if (v === 'kcal') return 'kcal';
      return v; // deja pasar otras unidades desconocidas
    };

    // Helper: canonizar nombres de nutrientes a las claves camelCase esperadas
    const canonicalizeNutrientName = (name: string | null | undefined): string => {
      if (!name) return '' as any;
      const raw = String(name).trim().toLowerCase();
      // Eliminar tildes/diacríticos (normalize NFD y quitar combining marks)
      const deburred = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Sanitizar: dejar solo caracteres alfanuméricos para facilitar coincidencias robustas
      const san = deburred.replace(/[^a-z0-9]/g, '');
      const map: Record<string, string> = {
        // vitaminas (EN)
        vitamind: 'vitaminD',
        vitamink: 'vitaminK',
        vitaminb6: 'vitaminB6',
        vitaminb12: 'vitaminB12',
        vitamina: 'vitaminA',
        vitaminc: 'vitaminC',
        vitamine: 'vitaminE',
        vitaminb1: 'vitaminB1',
        vitaminb2: 'vitaminB2',
        vitaminb3: 'vitaminB3',
        vitaminb5: 'vitaminB5',
        vitaminb7: 'vitaminB7',
        // Vit D subtypes/synonyms
        vitamind3: 'vitaminD',
        vitamind2: 'vitaminD',
        cholecalciferol: 'vitaminD',
        colecalciferol: 'vitaminD',
        ergocalciferol: 'vitaminD',
        // Vit K subtypes/synonyms
        vitamink1: 'vitaminK',
        vitamink2: 'vitaminK',
        phylloquinone: 'vitaminK',
        filoquinona: 'vitaminK',
        menaquinone: 'vitaminK',
        menaquinona: 'vitaminK',
        // Vit B6 synonyms
        pyridoxine: 'vitaminB6',
        piridoxina: 'vitaminB6',
        // Vit B12 synonyms
        cobalamin: 'vitaminB12',
        cobalamina: 'vitaminB12',
        cyanocobalamin: 'vitaminB12',
        // vitaminas (ES: "vitamina d", "vitamina k", etc.)
        vitaminad: 'vitaminD',
        vitaminak: 'vitaminK',
        vitaminab6: 'vitaminB6',
        vitaminab12: 'vitaminB12',
        vitaminaa: 'vitaminA',
        vitaminac: 'vitaminC',
        vitaminae: 'vitaminE',
        vitaminab1: 'vitaminB1',
        vitaminab2: 'vitaminB2',
        vitaminab3: 'vitaminB3',
        vitaminab5: 'vitaminB5',
        vitaminab7: 'vitaminB7',
        // Vit D (ES) subtypes
        vitaminad3: 'vitaminD',
        vitaminad2: 'vitaminD',
        // Vit K (ES) subtypes already covered (k1/k2 above)
        // folato
        folate: 'folate',
        folato: 'folate',
        acidofolico: 'folate',
        biotin: 'vitaminB7',
        biotina: 'vitaminB7',
        colina: 'choline',
        choline: 'choline',
        chloride: 'chloride',
        cloruro: 'chloride',
        // macros
        protein: 'protein',
        carbohydrates: 'carbohydrates',
        carbs: 'carbohydrates',
        fat: 'fat',
        fiber: 'fiber',
        fibre: 'fiber',
        calories: 'calories',
        // minerales comunes (EN)
        calcium: 'calcium',
        iron: 'iron',
        magnesium: 'magnesium',
        zinc: 'zinc',
        potassium: 'potassium',
        sodium: 'sodium',
        phosphorus: 'phosphorus',
        selenium: 'selenium',
        copper: 'copper',
        manganese: 'manganese',
        iodine: 'iodine',
        // minerales comunes (ES)
        calcio: 'calcium',
        hierro: 'iron',
        magnesio: 'magnesium',
        potasio: 'potassium',
        sodio: 'sodium',
        fosforo: 'phosphorus',
        selenio: 'selenium',
        cobre: 'copper',
        manganeso: 'manganese',
        yodo: 'iodine',
      };
      // Coincidencia directa por clave saneada
      if (san in map) return map[san];

      // Reglas por patrón para vitaminas con variaciones comunes en nombres
      // Vitamina D: variantes D2/D3, cholecalciferol/colecalciferol, ergocalciferol
      if (
        san.startsWith('vitamind') ||
        san.includes('cholecalciferol') || san.includes('colecalciferol') ||
        san.includes('ergocalciferol') ||
        /vitamina?d[23]?/i.test(deburred.replace(/\s+/g, '')) // tolera espacios y D2/D3
      ) {
        return 'vitaminD';
      }

      // Vitamina K: K1/K2, phylloquinone/filoquinona, menaquinone/menaquinona
      if (
        san.startsWith('vitamink') ||
        san.includes('phylloquinone') || san.includes('filoquinona') ||
        san.includes('menaquinone') || san.includes('menaquinona')
      ) {
        return 'vitaminK';
      }

      // Vitamina B6: pyridoxine/piridoxina
      if (san.startsWith('vitaminb6') || san.includes('pyridoxine') || san.includes('piridoxina')) {
        return 'vitaminB6';
      }

      // Vitamina B12: cobalamin/cobalamina/cyanocobalamin, B-12
      if (
        san.startsWith('vitaminb12') ||
        san.includes('cobalamin') || san.includes('cobalamina') || san.includes('cyanocobalamin')
      ) {
        return 'vitaminB12';
      }

      // Vitamina B5: pantothenic acid / ácido pantoténico
      if (
        san.startsWith('vitaminb5') ||
        san.includes('pantothenic') ||
        san.includes('pantotenico') ||
        san.includes('acidopantotenico')
      ) {
        return 'vitaminB5';
      }

      // Vitamina B7: biotin/biotina
      if (
        san.startsWith('vitaminb7') ||
        san.includes('biotin') || san.includes('biotina')
      ) {
        return 'vitaminB7';
      }

      // Colina
      if (san === 'colina' || san === 'choline') {
        return 'choline';
      }

      // Cloruro
      if (san === 'chloride' || san === 'cloruro') {
        return 'chloride';
      }

      // Dejar originales de macros/minerales si ya son canónicos
      const passthrough = new Set([
        'protein','carbohydrates','fat','fiber','calories',
        'folate','choline','chloride',
        'calcium','iron','magnesium','zinc','potassium','sodium','phosphorus','selenium','copper','manganese','iodine'
      ]);
      if (passthrough.has(san)) return san as any;

      // Fallback: devolver el nombre original (permitirá visualizar en debug aunque no sume a una RDA conocida)
      return name as any;
    };

    // Helper to convert between g, mg and µg so we keep units consistent with RDA
    const convertUnit = (value: number, from: string, to: string): number => {
      const f = normalizeUnit(from);
      const t = normalizeUnit(to);
      if (f === t) return value;
      const factorMap: Record<string, number> = { g: 1, mg: 1e-3, 'µg': 1e-6 };
      if (!(f in factorMap) || !(t in factorMap)) {
        // Unidad desconocida, no convertir
        return value;
      }
      const grams = value * factorMap[f];
      return grams / factorMap[t];
    };

    let rdaTargets: Array<{ nutrient: string; value: number; unit: string }> = [];
    {
      const { data, error } = await supabase
        .from('RecommendedDailyAllowance')
        .select('nutrient, value, unit, sex')
        .eq('ageGroup', ageGroup)
        .or(`sex.eq.${sex},sex.is.null`);
      if (error) {
        console.error('Error fetching RDAs:', error);
        throw error;
      }
      const rdaMap = new Map<string, { nutrient: string; value: number; unit: string; sex: string | null }>();
      for (const row of data || []) {
        const key = canonicalizeNutrientName(row.nutrient);
        const unit = normalizeUnit(row.unit);
        const existing = rdaMap.get(key);
        const rowSex = (row as any).sex ?? null;
        if (!existing) {
          rdaMap.set(key, { nutrient: key, value: Number(row.value), unit, sex: rowSex });
        } else if (!existing.sex && rowSex) {
          // Preferir fila específica por sexo sobre la neutra
          rdaMap.set(key, { nutrient: key, value: Number(row.value), unit, sex: rowSex });
        }
      }
      rdaTargets = Array.from(rdaMap.values()).map(({ nutrient, value, unit }) => ({ nutrient, value, unit }));
    }

    // Fallback temporal eliminado: usar únicamente RDAs del grupo etario actual

    const summaryMap = new Map<string, { total: number; unit: string; rda: number }>();
    rdaTargets.forEach((rda) => {
      const key = canonicalizeNutrientName(rda.nutrient);
      summaryMap.set(key, { total: 0, unit: normalizeUnit(rda.unit), rda: Number(rda.value) });
    });

    // Debug de presencia de vitaminas eliminado para reducir ruido en logs

    // Override macronutrient RDAs with user-specific targets
    try {
      // 1) Priorizar macros del UserProfile (perfil seleccionado)
      const selMacroProtein = (selectedProfile as any)?.macroProtein;
      const selMacroCarbs = (selectedProfile as any)?.macroCarbs;
      const selMacroFat = (selectedProfile as any)?.macroFat;

      // 2) Fallback a macros en la tabla profiles
      const macroProtein = (userProfile as any)?.macroProtein;
      const macroCarbs = (userProfile as any)?.macroCarbs;
      const macroFat = (userProfile as any)?.macroFat;

      const overrideMacro = (key: string, grams: unknown) => {
        const value = typeof grams === 'number' ? grams : Number(grams);
        if (!isNaN(value) && value > 0) {
          if (!summaryMap.has(key)) {
            summaryMap.set(key, { total: 0, unit: 'g', rda: value });
          } else {
            const current = summaryMap.get(key)!;
            current.rda = value;
            current.unit = 'g';
          }
          // RDA overridden from user profile
        }
      };

      // Aplicar primero overrides del perfil seleccionado (si hay)
      overrideMacro('protein', selMacroProtein);
      overrideMacro('carbohydrates', selMacroCarbs);
      overrideMacro('fat', selMacroFat);
      // Luego, si el perfil seleccionado no define alguno, usar el del profile clásico
      const overrideIfEmpty = (key: string, grams: unknown) => {
        const current = summaryMap.get(key);
        const hasValue = current && typeof current.rda === 'number' && current.rda > 0;
        if (!hasValue) overrideMacro(key, grams);
      };
      overrideIfEmpty('protein', macroProtein);
      overrideIfEmpty('carbohydrates', macroCarbs);
      overrideIfEmpty('fat', macroFat);
    } catch (e) {
      console.warn('Could not apply macro overrides from profile:', e);
    }

    // Aplicar overrides de RDAs de micronutrientes desde UserProfileRDA, si hay perfil seleccionado
    if (selectedProfile) {
      try {
        const { data: profRdas, error: prErr } = await supabase
          .from('UserProfileRDA')
          .select('nutrient, value, unit')
          .eq('userProfileId', selectedProfile.id);
        if (prErr) {
          console.warn('Could not fetch UserProfileRDA overrides:', prErr);
        } else {
          const macroBlock = new Set(['protein','carbohydrates','fat','calories']);
          for (const r of profRdas || []) {
            const key = canonicalizeNutrientName((r as any).nutrient);
            const unit = normalizeUnit((r as any).unit);
            const val = Number((r as any).value) || 0;
            // No sobrescribir macros/calorías con UserProfileRDA: se gestionan en UserProfile
            if (macroBlock.has(key)) continue;
            if (summaryMap.has(key)) {
              const entry = summaryMap.get(key)!;
              entry.rda = val;
              if (unit) entry.unit = unit;
            } else {
              summaryMap.set(key, { total: 0, unit: unit || '', rda: val });
            }
          }
        }
      } catch (e) {
        console.warn('Could not apply UserProfileRDA overrides:', e);
      }
    }

    // Helpers movidos arriba antes del primer uso (normalizeUnit, canonicalizeNutrientName, convertUnit)

    const foodIds = foodLogs.map((log: any) => log.foodId).filter((id: any) => id);
    const userFoodIds = foodLogs.map((log: any) => log.userFoodId).filter((id: any) => id);

    // Traer nutrientes de Food y UserFood en paralelo
    let nutrients: Array<{ foodId: string; nutrient: string; value: number; unit: string }> = [];
    let userNutrients: Array<{ userFoodId: string; nutrient: string; value: number; unit: string }> = [];
    if (foodIds.length > 0 || userFoodIds.length > 0) {
      const foodsPromise = foodIds.length > 0
        ? supabase
            .from('FoodNutrient')
            .select('foodId, nutrient, value, unit')
            .in('foodId', foodIds)
        : Promise.resolve({ data: [] as any[], error: null } as any);
      const userFoodsPromise = userFoodIds.length > 0
        ? supabase
            .from('UserFoodNutrient')
            .select('userFoodId, nutrient, value, unit')
            .in('userFoodId', userFoodIds)
        : Promise.resolve({ data: [] as any[], error: null } as any);
      const [foodsRes, userFoodsRes] = await Promise.all([foodsPromise, userFoodsPromise]);
      if (foodsRes?.error) { console.error('Error fetching food nutrients:', foodsRes.error); throw foodsRes.error; }
      if (userFoodsRes?.error) { console.error('Error fetching user food nutrients:', userFoodsRes.error); throw userFoodsRes.error; }
      nutrients = foodsRes?.data || [];
      userNutrients = userFoodsRes?.data || [];
    }

    const nutrientsByFoodId = new Map<string, Array<{ foodId: string; nutrient: string; value: number; unit: string }>>();
    for (const n of nutrients) {
      const key = n.foodId;
      if (!key) continue;
      if (!nutrientsByFoodId.has(key)) nutrientsByFoodId.set(key, []);
      nutrientsByFoodId.get(key)!.push(n);
    }

    const userNutrientsByFoodId = new Map<string, Array<{ userFoodId: string; nutrient: string; value: number; unit: string }>>();
    for (const n of userNutrients) {
      const key = n.userFoodId;
      if (!key) continue;
      if (!userNutrientsByFoodId.has(key)) userNutrientsByFoodId.set(key, []);
      userNutrientsByFoodId.get(key)!.push(n);
    }

    // Sumar nutrientes de alimentos globales
    if (foodIds.length > 0) {
      foodLogs.forEach((log: any) => {
        if (!log.foodId) return;
        const quantityRatio = log.quantity / 100;
        const foodNutrients = nutrientsByFoodId.get(log.foodId) ?? [];

        // Agrupar por clave canónica y decidir agregación vs subtipos
        const groups = new Map<string, Array<{ value: number; unit: string; orig: string }>>();
        foodNutrients.forEach((n) => {
          const c = canonicalizeNutrientName(n.nutrient);
          if (!groups.has(c)) groups.set(c, []);
          groups.get(c)!.push({ value: Number(n.value) || 0, unit: n.unit, orig: n.nutrient });
        });

        for (const [canon, items] of groups.entries()) {
          // Para Vit D y K: si existe entrada agregada ('vitamind'/'vitamink'), preferirla; si no, sumar subtipos (D2+D3, K1+K2)
          const hasAggregate = (() => {
            const aggKeys = canon === 'vitaminD'
              ? new Set(['vitamind', 'vitaminad'])
              : canon === 'vitaminK'
              ? new Set(['vitamink', 'vitaminak'])
              : new Set<string>();
            return items.some((it) => {
              const raw = String(it.orig).trim().toLowerCase();
              const deb = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const k = deb.replace(/[\s\-_]/g, '');
              return aggKeys.has(k);
            });
          })();

          const selected = hasAggregate
            ? items.filter((it) => {
                const raw = String(it.orig).trim().toLowerCase();
                const deb = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const k = deb.replace(/[\s\-_]/g, '');
                return canon === 'vitaminD' ? (k === 'vitamind' || k === 'vitaminad') : (canon === 'vitaminK' ? (k === 'vitamink' || k === 'vitaminak') : true);
              })
            : items;

          if (!summaryMap.has(canon)) {
            // Si no había RDA para este nutriente, inicializar con la unidad del primer item
            const firstUnit = normalizeUnit(selected[0]?.unit ?? items[0]?.unit ?? '');
            summaryMap.set(canon, { total: 0, unit: firstUnit, rda: 0 });
          }
          const current = summaryMap.get(canon)!;
          current.unit = normalizeUnit(current.unit);

          let sumForGroup = 0;
          for (const it of selected) {
            const fromUnitRaw = it.unit;
            const fromUnit = normalizeUnit(fromUnitRaw);
            const baseValue = it.value || 0;
            let val = 0;
            const isIU = typeof fromUnitRaw === 'string' && (() => {
              const letters = fromUnitRaw.trim().toLowerCase().replace(/[^a-z]/g, '');
              return letters.includes('iu') || letters.includes('ui');
            })();
            if (canon === 'vitaminD' && isIU) {
              const valueInMicrograms = baseValue * 0.025; // 1 IU = 0.025 µg
              val = convertUnit(valueInMicrograms, 'µg', current.unit);
            } else {
              val = convertUnit(baseValue, fromUnit, current.unit);
            }
            sumForGroup += val;
          }

          current.total += sumForGroup * quantityRatio;
        }
      });
    }

    // Sumar nutrientes de alimentos personalizados del usuario
    if (userFoodIds.length > 0) {
      foodLogs.forEach((log: any) => {
        if (!log.userFoodId) return;
        const quantityRatio = log.quantity / 100;
        const uNutrients = userNutrientsByFoodId.get(log.userFoodId) ?? [];

        const groups = new Map<string, Array<{ value: number; unit: string; orig: string }>>();
        uNutrients.forEach((n) => {
          const c = canonicalizeNutrientName(n.nutrient);
          if (!groups.has(c)) groups.set(c, []);
          groups.get(c)!.push({ value: Number(n.value) || 0, unit: n.unit, orig: n.nutrient });
        });

        for (const [canon, items] of groups.entries()) {
          const hasAggregate = (() => {
            const aggKeys = canon === 'vitaminD'
              ? new Set(['vitamind', 'vitaminad'])
              : canon === 'vitaminK'
              ? new Set(['vitamink', 'vitaminak'])
              : new Set<string>();
            return items.some((it) => {
              const raw = String(it.orig).trim().toLowerCase();
              const deb = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const k = deb.replace(/[\s\-_]/g, '');
              return aggKeys.has(k);
            });
          })();

          const selected = hasAggregate
            ? items.filter((it) => {
                const raw = String(it.orig).trim().toLowerCase();
                const deb = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const k = deb.replace(/[\s\-_]/g, '');
                return canon === 'vitaminD' ? (k === 'vitamind' || k === 'vitaminad') : (canon === 'vitaminK' ? (k === 'vitamink' || k === 'vitaminak') : true);
              })
            : items;

          if (!summaryMap.has(canon)) {
            const firstUnit = normalizeUnit(selected[0]?.unit ?? items[0]?.unit ?? '');
            summaryMap.set(canon, { total: 0, unit: firstUnit, rda: 0 });
          }
          const current = summaryMap.get(canon)!;
          current.unit = normalizeUnit(current.unit);

          let sumForGroup = 0;
          for (const it of selected) {
            const fromUnitRaw = it.unit;
            const fromUnit = normalizeUnit(fromUnitRaw);
            const baseValue = it.value || 0;
            let val = 0;
            const isIU = typeof fromUnitRaw === 'string' && (() => {
              const letters = fromUnitRaw.trim().toLowerCase().replace(/[^a-z]/g, '');
              return letters.includes('iu') || letters.includes('ui');
            })();
            if (canon === 'vitaminD' && isIU) {
              const valueInMicrograms = baseValue * 0.025;
              val = convertUnit(valueInMicrograms, 'µg', current.unit);
            } else {
              val = convertUnit(baseValue, fromUnit, current.unit);
            }
            sumForGroup += val;
          }

          current.total += sumForGroup * quantityRatio;
        }
      });
    }

    // Compute calorie target (RDA) from macro RDAs using 4/4/9 rule
    let calorieTarget = 0;
    try {
      const pRda = summaryMap.get('protein')?.rda || 0;
      const cRda = summaryMap.get('carbohydrates')?.rda || 0;
      const fRda = summaryMap.get('fat')?.rda || 0;
      calorieTarget = pRda * 4 + cRda * 4 + fRda * 9;
      if (!summaryMap.has('calories')) {
        summaryMap.set('calories', { total: 0, unit: 'kcal', rda: calorieTarget });
      } else {
        const cal = summaryMap.get('calories')!;
        cal.rda = calorieTarget;
        cal.unit = 'kcal';
      }
      
    } catch (e) {
      console.warn('Could not compute calorie target from macros:', e);
    }

    // Calorías del día: usar el mayor entre (a) suma directa del nutriente 'calories' y (b) cálculo 4/4/9 de macros consumidos
    try {
      const pTotal = summaryMap.get('protein')?.total || 0;
      const cTotal = summaryMap.get('carbohydrates')?.total || 0;
      const fTotal = summaryMap.get('fat')?.total || 0;
      const computedCalories = pTotal * 4 + cTotal * 4 + fTotal * 9;
      const directCal = summaryMap.get('calories')?.total || 0;
      const finalTotalCalories = Math.max(directCal, computedCalories);
      if (!summaryMap.has('calories')) {
        summaryMap.set('calories', { total: finalTotalCalories, unit: 'kcal', rda: calorieTarget });
      } else {
        const cal = summaryMap.get('calories')!;
        cal.total = finalTotalCalories;
        cal.unit = 'kcal';
        cal.rda = calorieTarget;
      }
    } catch (e) {
      console.warn('Could not compute final calorie total:', e);
    }

    const summary = Array.from(summaryMap.entries()).map(([nutrient, values]) => ({
      nutrient,
      ...values,
      percentage: values.rda > 0 ? (values.total / values.rda) * 100 : 0,
    }));

    // Build debug info to help verify macro overrides end-to-end
    const debug = {
      userId: userId,
      date,
      activeProfile: selectedProfile ? { id: selectedProfile.id, name: selectedProfile?.name ?? null } : null,
      profile: {
        age,
        sex,
        macroProtein: (userProfile as any)?.macroProtein ?? null,
        macroCarbs: (userProfile as any)?.macroCarbs ?? null,
        macroFat: (userProfile as any)?.macroFat ?? null,
      },
      finalRda: {
        protein: summaryMap.get('protein')?.rda ?? null,
        carbohydrates: summaryMap.get('carbohydrates')?.rda ?? null,
        fat: summaryMap.get('fat')?.rda ?? null,
        calories: summaryMap.get('calories')?.rda ?? null,
      },
      vitamins: {
        vitaminD: {
          rda: summaryMap.get('vitaminD')?.rda ?? null,
          unit: summaryMap.get('vitaminD')?.unit ?? null,
          total: summaryMap.get('vitaminD')?.total ?? null,
        },
        vitaminK: {
          rda: summaryMap.get('vitaminK')?.rda ?? null,
          unit: summaryMap.get('vitaminK')?.unit ?? null,
          total: summaryMap.get('vitaminK')?.total ?? null,
        },
        vitaminB6: {
          rda: summaryMap.get('vitaminB6')?.rda ?? null,
          unit: summaryMap.get('vitaminB6')?.unit ?? null,
          total: summaryMap.get('vitaminB6')?.total ?? null,
        },
        vitaminB12: {
          rda: summaryMap.get('vitaminB12')?.rda ?? null,
          unit: summaryMap.get('vitaminB12')?.unit ?? null,
          total: summaryMap.get('vitaminB12')?.total ?? null,
        },
      }
    };

    return new Response(JSON.stringify({ summary, foodLogs, debug }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Caught an unhandled error in the main try-catch block:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
