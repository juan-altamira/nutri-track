-- Agregar soporte para múltiples providers de pago (Lemon Squeezy + Mercado Pago)

-- 1. Hacer campos de Lemon Squeezy opcionales
ALTER TABLE public."Subscription" 
  ALTER COLUMN "lemonsqueezySubscriptionId" DROP NOT NULL,
  ALTER COLUMN "lemonsqueezyCustomerId" DROP NOT NULL,
  ALTER COLUMN "lemonsqueezyProductId" DROP NOT NULL,
  ALTER COLUMN "lemonsqueezyVariantId" DROP NOT NULL;

-- 2. Agregar columna para identificar el provider
ALTER TABLE public."Subscription" 
  ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT CHECK ("paymentProvider" IN ('lemonsqueezy', 'mercadopago'));

-- 3. Agregar columnas específicas para Mercado Pago
ALTER TABLE public."Subscription" 
  ADD COLUMN IF NOT EXISTS "mercadopagoSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "region" TEXT CHECK ("region" IN ('argentina', 'international')),
  ADD COLUMN IF NOT EXISTS "mercadopagoCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "mercadopagoPaymentMethodId" TEXT;

-- 4. Crear índices para Mercado Pago
CREATE INDEX IF NOT EXISTS "Subscription_mercadopagoSubscriptionId_idx" 
  ON public."Subscription"("mercadopagoSubscriptionId");

CREATE INDEX IF NOT EXISTS "Subscription_paymentProvider_idx" 
  ON public."Subscription"("paymentProvider");

-- 5. Constraint: Debe tener ID de uno de los dos providers
ALTER TABLE public."Subscription" 
  ADD CONSTRAINT "subscription_provider_check" 
  CHECK (
    ("lemonsqueezySubscriptionId" IS NOT NULL AND "paymentProvider" = 'lemonsqueezy') OR
    ("mercadopagoSubscriptionId" IS NOT NULL AND "paymentProvider" = 'mercadopago')
  );

-- 6. Unique constraint para Mercado Pago
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_mercadopagoSubscriptionId_unique" 
  ON public."Subscription"("mercadopagoSubscriptionId") 
  WHERE "mercadopagoSubscriptionId" IS NOT NULL;

-- 7. Actualizar comentarios
COMMENT ON COLUMN public."Subscription"."paymentProvider" IS 'Provider de pago: lemonsqueezy o mercadopago';
COMMENT ON COLUMN public."Subscription"."mercadopagoSubscriptionId" IS 'ID de preapproval en Mercado Pago';
COMMENT ON COLUMN public."Subscription"."region" IS 'Región de pago: argentina (MP) o international (LS)';
COMMENT ON COLUMN public."Subscription"."mercadopagoCustomerId" IS 'Payer ID en Mercado Pago';
