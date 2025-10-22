# 🚨 SOLUCIÓN: Webhooks de Mercado Pago NO llegan

## 🔍 Problema Identificado

**Los pagos funcionan**, pero los webhooks **NO llegan** (0% notificaciones entregadas).

**Causa raíz:**
- Webhooks configurados en la aplicación de **PRODUCCIÓN**
- Pero las credenciales en Vercel pueden ser de **TEST**
- O los eventos de suscripción no se están enviando

---

## ✅ Solución Paso a Paso

### 1️⃣ Verificar Credenciales en Vercel

**Ve a:** https://vercel.com/tu-proyecto/settings/environment-variables

**Verificá que tengas:**
```bash
# Producción (APP_USR, no TEST)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3247172230150643-...
PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_PLAN_ID=98f66b2d5c97438592f97a42d6dc9165
```

**Si están en TEST, cambialas a PRODUCCIÓN:**
```bash
# ❌ INCORRECTO (TEST)
MERCADOPAGO_ACCESS_TOKEN=TEST-3247172230150643-...

# ✅ CORRECTO (PRODUCCIÓN)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3247172230150643-...
```

**Obtener credenciales de producción:**
1. https://www.mercadopago.com.ar/developers/panel/app
2. Tu aplicación → Credenciales de producción
3. Copiar Access Token y Public Key

---

### 2️⃣ Actualizar .env Local (para consistencia)

**Archivo:** `/home/usuario/CascadeProjects/Nutri-Track/apps/web-svelte/.env`

**Cambiar:**
```bash
# De TEST a PRODUCCIÓN
PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-f9ed6f21-ac57-4000-8ad2-e7f0910f0e3b
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3247172230150643-101823-a0adc23899a27f1b52ee3602f1e92ea1-762286284
MERCADOPAGO_PLAN_ID=98f66b2d5c97438592f97a42d6dc9165
```

---

### 3️⃣ Re-deployar en Vercel

```bash
cd /home/usuario/CascadeProjects/Nutri-Track/apps/web-svelte
git add .env
git commit -m "fix: Cambiar a credenciales de producción MP"
git push

# O deploy manual
vercel --prod
```

---

### 4️⃣ Verificar Webhooks en Panel MP

**Ve a:** https://www.mercadopago.com.ar/developers/panel/app/3247172230150643/webhooks

**Debe estar configurado:**
- ✅ URL: `https://www.nutri-track.pro/api/webhooks/mercadopago`
- ✅ Eventos:
  - payment
  - subscription_preapproval
  - subscription_authorized_payment
  - subscription_preapproval_plan

**Si no está, ejecutá:**
```bash
cd apps/web-svelte
node scripts/test-webhook-mp.js
```

O configuralo manualmente en el panel.

---

### 5️⃣ Probar con Pago Real

1. **Hacer un nuevo pago de prueba**
2. **Monitorear logs:**
   - Vercel: https://vercel.com/tu-proyecto/logs
   - Buscar: `[Webhook MP]`
3. **Verificar que llegue:**
   - Debería ver: `[Webhook MP] Preapproval ID: ...`
   - Y luego: `[Webhook MP] Suscripción procesada exitosamente`

---

## 🔍 Debugging

### Ver Logs de Vercel

```bash
# Instalar CLI de Vercel
npm i -g vercel

# Ver logs en tiempo real
vercel logs --follow
```

### Verificar en Supabase

```sql
-- Ver si la suscripción se creó
SELECT * FROM "Subscription"
WHERE "mercadopagoSubscriptionId" = 'TU_PREAPPROVAL_ID';

-- Ver todas las suscripciones
SELECT 
  id,
  status,
  "paymentProvider",
  "mercadopagoSubscriptionId",
  "createdAt"
FROM "Subscription"
ORDER BY "createdAt" DESC;
```

### Simular Webhook Manualmente

```bash
cd apps/web-svelte
node scripts/simulate-mp-webhook.js
```

O usar curl:
```bash
curl -X POST https://www.nutri-track.pro/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "action": "created",
    "type": "subscription_preapproval",
    "data": { "id": "TU_PREAPPROVAL_ID" }
  }'
```

---

## 📋 Checklist de Verificación

- [ ] Credenciales de PRODUCCIÓN en Vercel
- [ ] Credenciales de PRODUCCIÓN en .env local
- [ ] Webhooks configurados en panel MP
- [ ] URL del webhook correcta
- [ ] Deploy hecho en Vercel
- [ ] Pago de prueba realizado
- [ ] Webhook llegó (ver logs de Vercel)
- [ ] Suscripción creada en Supabase

---

## 🆘 Si Sigue Fallando

### Opción A: Crear Suscripción Manualmente

Si el webhook no llega, podés crear la suscripción manualmente:

```sql
-- En Supabase SQL Editor
INSERT INTO "Subscription" (
  "userId",
  status,
  "paymentProvider",
  "mercadopagoSubscriptionId",
  region,
  "trialEndsAt",
  "renewsAt"
) VALUES (
  'TU_USER_ID',           -- ID del usuario (UUID)
  'on_trial',              -- Estado
  'mercadopago',           -- Provider
  'TU_PREAPPROVAL_ID',    -- ID de la suscripción en MP
  'argentina',             -- Región
  NOW() + INTERVAL '14 days',  -- Trial termina en 14 días
  NOW() + INTERVAL '14 days'   -- Renueva en 14 días
);
```

**Obtener TU_USER_ID:**
```sql
SELECT id, email FROM auth.users WHERE email = 'tu@email.com';
```

**Obtener TU_PREAPPROVAL_ID:**
- Ve al panel de MP → Suscripciones
- O búscalo en los logs de Vercel

### Opción B: Contactar Soporte de MP

Si nada funciona, contactá a soporte con:
```
Problema: Webhooks de suscripciones no llegan (0% entregadas)

Detalles:
- Application ID: 3247172230150643
- Preapproval ID: [el que te dio MP]
- Webhook URL: https://www.nutri-track.pro/api/webhooks/mercadopago
- El endpoint SÍ funciona (simulación exitosa)
- Pero no recibo notificaciones cuando creo suscripciones reales

Solicito:
- Verificar por qué no se envían webhooks de subscription_preapproval
- Confirmar si hay algún problema con mi configuración
```

---

## ✅ Resultado Esperado

Después de aplicar la solución:
1. ✅ Webhooks llegan a tu endpoint
2. ✅ Suscripción se crea en Supabase
3. ✅ Página success detecta la suscripción (antes de 30 seg)
4. ✅ Dashboard muestra suscripción activa
5. ✅ Panel MP muestra > 0% notificaciones entregadas

---

**Creado:** 2025-10-22
**Estado:** PENDIENTE DE APLICAR
