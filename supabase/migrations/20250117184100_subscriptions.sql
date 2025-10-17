-- Crear tabla para almacenar información de suscripciones de Lemon Squeezy
CREATE TABLE IF NOT EXISTS public."Subscription" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "lemonsqueezySubscriptionId" TEXT NOT NULL UNIQUE,
  "lemonsqueezyCustomerId" TEXT NOT NULL,
  "lemonsqueezyOrderId" TEXT,
  "lemonsqueezyProductId" TEXT NOT NULL,
  "lemonsqueezyVariantId" TEXT NOT NULL,
  status TEXT NOT NULL, -- active, cancelled, expired, on_trial, paused, past_due
  "renewsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "trialEndsAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT "Subscription_userId_unique" UNIQUE ("userId")
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON public."Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON public."Subscription"(status);
CREATE INDEX IF NOT EXISTS "Subscription_lemonsqueezySubscriptionId_idx" ON public."Subscription"("lemonsqueezySubscriptionId");

-- RLS: Los usuarios solo pueden ver sus propias suscripciones
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public."Subscription"
  FOR SELECT
  USING (auth.uid() = "userId");

-- Función para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_updated_at
  BEFORE UPDATE ON public."Subscription"
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Comentarios
COMMENT ON TABLE public."Subscription" IS 'Almacena las suscripciones de Lemon Squeezy de los usuarios';
COMMENT ON COLUMN public."Subscription"."lemonsqueezySubscriptionId" IS 'ID de suscripción en Lemon Squeezy';
COMMENT ON COLUMN public."Subscription".status IS 'Estado de la suscripción: active, cancelled, expired, on_trial, paused, past_due';
