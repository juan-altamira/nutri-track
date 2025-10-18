import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // No verificar sesión aquí, lo haremos en el cliente
  const { session } = await locals.safeGetSession();
  
  return {
    session,
  };
};
