import { createClient } from '@supabase/supabase-js';
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public';

/**
 * Singleton Supabase client for the SvelteKit app.
 * Uses public env vars defined in `.env` or `.env.local` at the project root.
 *
 * Docs:
 * https://supabase.com/docs/reference/javascript/introduction
 * https://kit.svelte.dev/docs/modules#$env-static-public
 */
export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);
