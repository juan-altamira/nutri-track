import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCheckout, STORE_ID, VARIANT_ID } from '$lib/lemonsqueezy';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Verificar que el usuario esté autenticado
    const { data: { session } } = await locals.supabase.auth.getSession();
    
    if (!session) {
      throw error(401, 'No autenticado');
    }

    const { email } = await request.json();

    // Crear checkout en Lemon Squeezy
    const checkout = await createCheckout(
      STORE_ID,
      VARIANT_ID,
      {
        checkoutData: {
          email: email || session.user.email,
          custom: {
            user_id: session.user.id
          }
        },
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          discount: true,
          dark: false,
          subscriptionPreview: true,
          buttonColor: '#3B82F6' // Azul de Tailwind
        },
        expiresAt: null,
        preview: false,
        testMode: true // Cambiar a false en producción
      }
    );

    if (!checkout || !checkout.data) {
      throw error(500, 'Error al crear checkout');
    }

    return json({
      checkoutUrl: checkout.data.attributes.url
    });

  } catch (err) {
    console.error('[Create Checkout Error]:', err);
    throw error(500, 'Error al crear checkout');
  }
};
