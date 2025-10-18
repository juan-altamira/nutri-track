import { LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID } from '$env/static/private';
import {
  PUBLIC_LEMON_SQUEEZY_PRODUCT_ID,
  PUBLIC_LEMON_SQUEEZY_VARIANT_ID
} from '$env/static/public';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

interface CreateCheckoutOptions {
  userId: string;
  userEmail: string;
  userName?: string;
  isRenewal?: boolean; // Usuario ya tuvo suscripción antes
}

export async function createCheckout(options: CreateCheckoutOptions) {
  const { userId, userEmail, userName, isRenewal = false } = options;

  const checkoutData = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: userEmail,
          name: userName || userEmail.split('@')[0] || 'Usuario',
          custom: {
            user_id: userId, // Este es crítico para el webhook
            is_renewal: isRenewal ? 'true' : 'false',
          },
        },
        test_mode: false,
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
          desc: true,
          discount: true,
          dark: false,
          subscription_preview: true,
          button_color: '#003366',
        },
        product_options: {
          enabled_variants: [PUBLIC_LEMON_SQUEEZY_VARIANT_ID],
          redirect_url: 'https://www.nutri-track.pro/subscription/success',
          receipt_button_text: 'Ir a Nutri-Track',
          receipt_link_url: 'https://www.nutri-track.pro/dashboard',
          receipt_thank_you_note: '¡Gracias por suscribirte a Nutri-Track!',
        },
        expires_at: null,
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: LEMON_SQUEEZY_STORE_ID,
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: PUBLIC_LEMON_SQUEEZY_VARIANT_ID,
          },
        },
      },
    },
  };

  const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}`,
    },
    body: JSON.stringify(checkoutData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[LemonSqueezy] Checkout error:', {
      status: response.status,
      statusText: response.statusText,
      body: error,
    });
    throw new Error(`Lemon Squeezy error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.data.attributes.url; // URL del checkout
}

export async function getSubscription(subscriptionId: string) {
  const response = await fetch(`${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subscription');
  }

  return response.json();
}
