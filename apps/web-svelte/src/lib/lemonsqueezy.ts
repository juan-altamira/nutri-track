import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import { 
  LEMON_SQUEEZY_API_KEY,
  LEMON_SQUEEZY_STORE_ID,
  LEMON_SQUEEZY_VARIANT_ID
} from '$env/static/private';

// Configurar Lemon Squeezy con la API key
lemonSqueezySetup({
  apiKey: LEMON_SQUEEZY_API_KEY,
  onError: (error) => {
    console.error('[Lemon Squeezy Error]:', error);
    throw error;
  }
});

export const STORE_ID = LEMON_SQUEEZY_STORE_ID;
export const VARIANT_ID = LEMON_SQUEEZY_VARIANT_ID;

export { 
  createCheckout,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  listSubscriptions
} from '@lemonsqueezy/lemonsqueezy.js';
