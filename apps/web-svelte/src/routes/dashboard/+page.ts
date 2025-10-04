import type { PageLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import { redirect } from '@sveltejs/kit';

// Esta página depende de la sesión del usuario; deshabilitamos SSR y
// usamos `load` del lado del cliente para obtener los datos.
export const ssr = false;

export const load: PageLoad = async ({ depends, url }) => {
  depends('app:daily-summary');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect(303, '/login');
  }

  const qDate = url.searchParams.get('date');
  const qProfileId = url.searchParams.get('profileId');
  // Use local date to avoid shifting a day in timezones west of UTC
  const getTodayLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = getTodayLocal();
  const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : today;
  const profileId = qProfileId && qProfileId.length > 0 ? qProfileId : null;
  let summaryData: any = null;
  let summaryError: string | null = null;
  try {
    const { data, error } = await supabase.functions.invoke('get-daily-summary', {
      body: { date, profileId }
    });
    if (error) {
      const anyErr = error as any;
      const contextBody = anyErr?.context?.body;
      const contextStr = contextBody
        ? (typeof contextBody === 'string' ? contextBody : JSON.stringify(contextBody))
        : null;
      summaryError = contextStr ? `${error.message}: ${contextStr}` : error.message;
      console.error('[get-daily-summary] status:', anyErr?.status, 'message:', error.message, 'context:', anyErr?.context);
    } else {
      summaryData = data;
    }
  } catch (e: any) {
    summaryError = e?.message ?? String(e);
    console.error('[get-daily-summary] invoke failed:', e);
  }

  return {
    summary: summaryData,
    error: summaryError,
    date,
    profileId
  };
};
