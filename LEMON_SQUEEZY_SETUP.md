# 🍋 Configuración de Lemon Squeezy

Guía paso a paso para configurar el sistema de pagos con Lemon Squeezy.

## 📋 Requisitos Previos

- Cuenta en Lemon Squeezy: https://app.lemonsqueezy.com
- Producto ya creado (Nutri Track - 9900 ARS/mes con 14 días de prueba)
- Acceso al proyecto de Supabase

---

## 🔑 Paso 1: Obtener Credenciales de Lemon Squeezy

### A. API Key

1. Ve a: https://app.lemonsqueezy.com/settings/api
2. Click en **"Create API Key"**
3. Dale un nombre: `Nutri-Track Production`
4. Copia la key (empieza con `lmsq_api_...`)
5. **⚠️ IMPORTANTE**: Guárdala en un lugar seguro, solo se muestra una vez

### B. Store ID

1. Ve a: https://app.lemonsqueezy.com/settings/stores
2. Copia el número del **Store ID** (aparece en la URL o en la configuración)

### C. Variant ID

1. Ve a **Products** → **Nutri Track**
2. Click en el producto
3. En la sección de **Variants**, copia el **Variant ID** del plan mensual

---

## 🔧 Paso 2: Configurar Variables de Entorno

### En tu archivo `.env` local:

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://pjtizyzmhywcujerhipa.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=lmsq_api_tu_key_aqui
LEMON_SQUEEZY_STORE_ID=12345
LEMON_SQUEEZY_VARIANT_ID=67890
LEMON_SQUEEZY_WEBHOOK_SECRET=tu_webhook_secret_aqui
```

### En Vercel (Variables de Entorno):

1. Ve a: https://vercel.com/juanaltamiras-projects/nutri-track/settings/environment-variables
2. Agrega cada variable:
   - `LEMON_SQUEEZY_API_KEY`
   - `LEMON_SQUEEZY_STORE_ID`
   - `LEMON_SQUEEZY_VARIANT_ID`
   - `LEMON_SQUEEZY_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🗄️ Paso 3: Crear Tabla en Supabase

### Opción A: Desde el Dashboard

1. Ve a: https://supabase.com/dashboard/project/pjtizyzmhywcujerhipa/editor
2. Ejecuta el archivo: `supabase/migrations/20250105_create_subscriptions_table.sql`

### Opción B: Desde CLI

```bash
cd supabase
supabase db push --db-url postgresql://postgres:[PASSWORD]@db.pjtizyzmhywcujerhipa.supabase.co:5432/postgres
```

---

## 🔗 Paso 4: Configurar Webhooks en Lemon Squeezy

### A. Crear Webhook

1. Ve a: https://app.lemonsqueezy.com/settings/webhooks
2. Click en **"+ Create Webhook"**
3. Configura:
   - **URL**: `https://www.nutri-track.pro/api/webhooks/lemonsqueezy`
   - **Signing Secret**: Genera uno nuevo (cópialo para el `.env`)
   - **Events**: Selecciona todos los de **Subscription**:
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_resumed`
     - `subscription_expired`
     - `subscription_paused`
     - `subscription_unpaused`
     - `subscription_payment_success`
     - `subscription_payment_failed`

4. Click en **"Create Webhook"**

### B. Actualizar Variable de Entorno

Copia el **Signing Secret** y actualízalo en:
- `.env` local
- Variables de entorno de Vercel

---

## 🔄 Paso 5: Configurar URLs de Redirección

En Lemon Squeezy, configura las URLs de éxito y cancelación:

1. Ve a tu producto **Nutri Track**
2. En **Checkout Settings**:
   - **Success URL**: `https://www.nutri-track.pro/subscribe/success`
   - **Cancel URL**: `https://www.nutri-track.pro/subscribe/canceled`

---

## 🧪 Paso 6: Probar el Flujo

### Modo Test (Desarrollo)

1. Asegúrate que en `create-checkout/+server.ts` esté:
   ```typescript
   testMode: true
   ```

2. Usa tarjetas de prueba de Lemon Squeezy:
   - **Éxito**: `4242 4242 4242 4242`
   - **Fallo**: `4000 0000 0000 0002`

### Flujo Completo

1. **Registro**: Usuario se registra en `/signup`
2. **Confirmación**: Confirma email
3. **Suscripción**: Redirige a `/subscribe`
4. **Checkout**: Click en "Comenzar Prueba Gratuita"
5. **Pago**: Ingresa datos en Lemon Squeezy
6. **Webhook**: Lemon Squeezy notifica a tu backend
7. **Base de datos**: Se crea registro en `subscriptions`
8. **Éxito**: Redirige a `/subscribe/success`
9. **Dashboard**: Usuario accede con suscripción activa

---

## 🚀 Paso 7: Activar Modo Producción

Cuando estés listo para cobros reales:

1. En Lemon Squeezy, activa el modo **Live**
2. Obtén nuevas API keys de producción
3. Actualiza las variables de entorno
4. En `create-checkout/+server.ts`, cambia:
   ```typescript
   testMode: false
   ```

---

## 📊 Monitoreo

### Ver Suscripciones en Supabase

```sql
SELECT 
  u.email,
  s.status,
  s.is_trial,
  s.trial_ends_at,
  s.renews_at,
  s.created_at
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC;
```

### Ver Webhooks en Lemon Squeezy

1. Ve a: https://app.lemonsqueezy.com/settings/webhooks
2. Click en tu webhook
3. Revisa el **Log** para ver eventos recibidos

---

## 🐛 Troubleshooting

### Webhook no funciona

1. Verifica que la URL sea correcta y accesible públicamente
2. Revisa que el **Signing Secret** coincida en `.env`
3. Mira los logs en Vercel: https://vercel.com/juanaltamiras-projects/nutri-track/logs

### Checkout no se crea

1. Verifica las API keys en variables de entorno
2. Revisa que `STORE_ID` y `VARIANT_ID` sean correctos
3. Mira la consola del navegador para errores

### Usuario no puede acceder al dashboard

1. Verifica que exista registro en tabla `subscriptions`
2. Revisa que `status` sea `on_trial` o `active`
3. Verifica que el middleware de protección esté funcionando

---

## 📝 Notas Importantes

- **14 días de prueba**: Configurado en Lemon Squeezy a nivel de producto
- **Precio**: 9900 ARS/mes (configurado en Lemon Squeezy)
- **Webhooks**: Críticos para actualizar el estado de suscripción
- **Service Role Key**: Necesaria para bypass RLS en webhooks
- **Test Mode**: Siempre prueba primero antes de activar producción

---

## ✅ Checklist Final

- [ ] API Key de Lemon Squeezy obtenida
- [ ] Store ID y Variant ID copiados
- [ ] Variables de entorno configuradas (local y Vercel)
- [ ] Tabla `subscriptions` creada en Supabase
- [ ] Webhook configurado en Lemon Squeezy
- [ ] URLs de redirección configuradas
- [ ] Flujo probado en modo test
- [ ] Modo producción activado (cuando estés listo)

---

¡Listo! Tu sistema de pagos con Lemon Squeezy está configurado. 🎉
