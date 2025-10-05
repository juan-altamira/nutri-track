-- Crear tabla de suscripciones para Lemon Squeezy
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Lemon Squeezy IDs
  lemon_squeezy_customer_id TEXT,
  lemon_squeezy_subscription_id TEXT UNIQUE,
  lemon_squeezy_order_id TEXT,
  lemon_squeezy_product_id TEXT,
  lemon_squeezy_variant_id TEXT,
  
  -- Estado de la suscripción
  status TEXT NOT NULL DEFAULT 'inactive', 
  -- Posibles valores: 'on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'
  
  -- Información de la suscripción
  product_name TEXT,
  variant_name TEXT,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'ARS',
  
  -- Fechas importantes
  trial_ends_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Flags
  is_trial BOOLEAN DEFAULT false,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_squeezy_id ON public.subscriptions(lemon_squeezy_subscription_id);

-- Habilitar Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propia suscripción
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Solo el sistema puede insertar/actualizar suscripciones (via service role)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.subscriptions IS 'Almacena información de suscripciones de Lemon Squeezy';
COMMENT ON COLUMN public.subscriptions.status IS 'Estado actual de la suscripción: on_trial, active, paused, past_due, unpaid, cancelled, expired';
COMMENT ON COLUMN public.subscriptions.is_trial IS 'Indica si la suscripción está en período de prueba (14 días)';
