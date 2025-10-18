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
}

export async function createCheckout(options: CreateCheckoutOptions) {
  const { userId, userEmail, userName } = options;

  const checkoutData = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: userEmail,
          name: userName || '',
          custom: {
            user_id: userId, // Este es crítico para el webhook
          },
        },
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
