# 🧪 INSTRUCCIONES PARA PROBAR EL SISTEMA

## ⏱️ **Paso 0: Esperar Deploy** (2-3 min)

El deploy en Vercel se activa automáticamente con el `git push`.

**Verificar estado del deploy:**
1. Ve a: https://vercel.com/dashboard
2. Busca tu proyecto "nutri-track"
3. Debería aparecer "Building..." o "Deploying..."
4. Espera a que diga **"Ready"** ✅

---

## 🧪 **Opción A: Probar con Usuario Nuevo** (Recomendado)

### 1. Crear nuevo usuario de prueba

```
Email: test-nutri@gmail.com (o cualquier email diferente)
Contraseña: [la que prefieras]
```

### 2. Iniciar suscripción

1. Ir a `/subscription`
2. Seleccionar **Argentina**
3. Clic en **"Comenzar Prueba Gratuita"**

### 3. Pagar en Mercado Pago

**Opción 1: Tarjeta de prueba**
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre: APRO
```

**Opción 2: Tu tarjeta real**
- Usá cualquiera de las que ya probaste
- El pago es real pero tenés 14 días de trial

### 4. Observar el proceso

**En la página de éxito:**
- Debería ver spinner: "Verificando suscripción..."
- Contador de intentos: "Intento X de 15"
- En 10-15 segundos: "¡Suscripción confirmada!" ✅

**Logs a monitorear (F12 → Console):**
```
[Success] Iniciando verificación...
[Success] User ID: ...
[Success] Preapproval ID de URL: ...
[Success] Intento 1 - Verificando suscripción...
[Success] Intento 5 - Verificando suscripción...
[Success] Webhook no procesó, intentando sync manual...
[Sync MP] ✅ Sync exitoso!
[Success] ¡Suscripción encontrada!
```

### 5. Verificar acceso

- Debería redirigir a `/dashboard`
- Sin selector de país
- Mensaje: "Prueba gratuita - 14 días restantes"

---

## 🔄 **Opción B: Probar Borrando Tu Suscripción Actual**

### 1. Borrar suscripción en Supabase

**Ve a:** https://supabase.com/dashboard/project/pjtizyzmhywcujerhipa/editor

**Ejecutá:**
```sql
-- Ver tu suscripción actual
SELECT * FROM "Subscription" 
WHERE "userId" = 'f7f1b1a1-54b5-43d8-9663-40e549ba4d49';

-- Borrarla
DELETE FROM "Subscription" 
WHERE "userId" = 'f7f1b1a1-54b5-43d8-9663-40e549ba4d49';
```

### 2. Cerrar sesión y volver a entrar

```bash
# O simplemente ir a:
https://www.nutri-track.pro/logout
```

### 3. Volver a suscribirte

- Ir a `/subscription`
- Seleccionar Argentina
- Seguir pasos de Opción A desde el punto 2

### ⚠️ **IMPORTANTE:**

Si usás esta opción:
- Te va a cobrar un segundo trial (no hay problema, son solo 14 días)
- O podés cancelar la primera suscripción en MP primero:
  1. Panel MP: https://www.mercadopago.com.ar/developers/panel/app/3247172230150643
  2. Suscripciones → Buscar tu suscripción
  3. Cancelar

---

## 📊 **Qué Verificar**

### ✅ **Flujo Exitoso:**

1. **Pago procesado en MP** ✅
2. **Redirección a success** con `preapproval_id` en URL ✅
3. **Polling detecta suscripción** en 10-15 segundos ✅
4. **Mensaje "Suscripción confirmada"** ✅
5. **Redirección a dashboard** ✅
6. **Dashboard funciona** sin selector de país ✅

### 🔍 **Logs Importantes:**

**En Browser Console (F12):**
```
[Success] Preapproval ID de URL: 2fd504bc...
[Success] Webhook no procesó, intentando sync manual...
[Sync MP] ✅ Sync exitoso!
```

**Esto significa que el FALLBACK funcionó** (webhook no llegó pero el sistema lo resolvió automáticamente).

---

## 🆘 **Si Algo Falla**

### **Problema: No redirige a success**

**Solución:**
1. Verificar URL en Mercado Pago después del pago
2. Debería tener `preapproval_id=...` en la URL
3. Si no, el problema es la configuración de `back_url`

### **Problema: Timeout (30 segundos)**

**Solución:**
1. Ver Console (F12)
2. Verificar si intentó sync:
   - Si dice "Webhook no procesó..." → Funcionó el fallback
   - Si NO lo dice → Puede que no haya `preapproval_id` en URL

3. Verificar en Supabase si la suscripción se creó:
```sql
SELECT * FROM "Subscription" 
WHERE "userId" = 'TU_USER_ID'
ORDER BY "createdAt" DESC;
```

### **Problema: Error 500 en sync**

**Revisar:**
1. Credenciales en Vercel (deben ser APP_USR)
2. Logs de Vercel: https://vercel.com/[tu-usuario]/nutri-track/logs
3. Buscar: `[Sync MP] Error`

---

## 📝 **Script para Verificar Después de la Prueba**

```bash
cd /home/usuario/CascadeProjects/Nutri-Track/apps/web-svelte

# Ver todas las suscripciones creadas
node scripts/find-mp-subscription.js
```

**En Supabase:**
```sql
-- Ver todas las suscripciones
SELECT 
  "userId",
  status,
  "paymentProvider",
  "mercadopagoSubscriptionId",
  "createdAt"
FROM "Subscription"
ORDER BY "createdAt" DESC;

-- Debería haber 2 (la tuya anterior + la nueva de prueba)
```

---

## 🎯 **Resultado Esperado**

Después de la prueba:

### **Webhook Funciona:**
```
Usuario paga → MP redirige → Webhook crea suscripción → 
Success detecta → Acceso en 3-5 segundos ✅
```

### **Webhook NO Funciona (Fallback):**
```
Usuario paga → MP redirige → Webhook NO llega → 
Fallback detecta → Sync crea suscripción → 
Acceso en 12-15 segundos ✅
```

**Ambos escenarios funcionan perfectamente.**

---

## ✅ **Checklist de Prueba**

- [ ] Deploy en Vercel completado (estado "Ready")
- [ ] Variables en Vercel verificadas (APP_USR)
- [ ] Usuario de prueba creado (o suscripción borrada)
- [ ] Pago procesado en MP exitosamente
- [ ] Página success mostró "Verificando..."
- [ ] Mensaje "Suscripción confirmada" apareció
- [ ] Redirigió a dashboard correctamente
- [ ] Dashboard funciona sin selector de país
- [ ] Estado muestra "Prueba gratuita - X días restantes"
- [ ] Console logs verificados (sync funcionó)
- [ ] Suscripción visible en Supabase

---

## 🎊 **Después de la Prueba Exitosa**

**Si todo funciona:**
1. ✅ El sistema está listo para producción
2. ✅ Todos los futuros usuarios funcionarán automáticamente
3. ✅ No necesitás intervención manual nunca más

**Podés:**
- Responder a Mercado Pago confirmando que funciona
- Compartir el email del soporte MP si querés
- Empezar a usar/promocionar tu app

---

**¿Listo para probar?** 🚀

**Recordá:** Esperá 2-3 minutos a que Vercel termine el deploy antes de empezar la prueba.
