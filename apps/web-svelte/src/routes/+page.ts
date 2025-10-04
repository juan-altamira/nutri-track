import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const ssr = false;

export async function load() {
  const { data: { session } } = await supabase.auth.getSession();
  throw redirect(302, session ? '/dashboard' : '/login');
}
