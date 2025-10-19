-- Agregar columnas para soportar Mercado Pago como proveedor de pagos

-- Agregar columna para identificar el proveedor de pagos
ALTER TABLE public."Subscription" 
ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'lemonsqueezy' CHECK ("paymentProvider" IN ('lemonsqueezy', 'mercadopago'));

-- Agregar columna para guardar ID de suscripción de Mercado Pago
ALTER TABLE public."Subscription"
ADD COLUMN IF NOT EXISTS "mercadopagoSubscriptionId" TEXT;

-- Agregar columna para identificar la región del usuario
ALTER TABLE public."Subscription"
ADD COLUMN IF NOT EXISTS "region" TEXT DEFAULT 'international' CHECK ("region" IN ('argentina', 'international'));

-- Agregar columna para guardar customer ID de Mercado Pago
ALTER TABLE public."Subscription"
ADD COLUMN IF NOT EXISTS "mercadopagoCustomerId" TEXT;

-- Agregar columna para guardar order ID de Mercado Pago
ALTER TABLE public."Subscription"
ADD COLUMN IF NOT EXISTS "mercadopagoOrderId" TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN public."Subscription"."paymentProvider" IS 'Proveedor de pagos: lemonsqueezy para internacional, mercadopago para Argentina';
COMMENT ON COLUMN public."Subscription"."mercadopagoSubscriptionId" IS 'ID de la suscripción en Mercado Pago';
COMMENT ON COLUMN public."Subscription"."region" IS 'Región del usuario: argentina o international';
COMMENT ON COLUMN public."Subscription"."mercadopagoCustomerId" IS 'ID del cliente en Mercado Pago';
COMMENT ON COLUMN public."Subscription"."mercadopagoOrderId" IS 'ID de la orden en Mercado Pago';
