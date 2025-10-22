-- Hacer campos de Lemon Squeezy opcionales para soportar Mercado Pago

ALTER TABLE public."Subscription" 
  ALTER COLUMN "lemonsqueezySubscriptionId" DROP NOT NULL,
  ALTER COLUMN "lemonsqueezyCustomerId" DROP NOT NULL,
  ALTER COLUMN "lemonsqueezyProductId" DROP NOT NULL,
  ALTER COLUMN "lemonsqueezyVariantId" DROP NOT NULL;

-- Verificar estructura
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'Subscription'
  AND table_schema = 'public'
ORDER BY ordinal_position;
