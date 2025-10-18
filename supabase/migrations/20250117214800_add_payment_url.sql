-- Agregar columna para URL de actualización de método de pago
ALTER TABLE public."Subscription"
  ADD COLUMN IF NOT EXISTS "updatePaymentMethodUrl" TEXT;

COMMENT ON COLUMN public."Subscription"."updatePaymentMethodUrl" IS 'URL para actualizar método de pago en Lemon Squeezy';
