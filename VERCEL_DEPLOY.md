# Deploy en Vercel 🚀

Guía paso a paso para desplegar Nutri-Track en Vercel.

## 📋 Requisitos Previos

1. Cuenta de Vercel (https://vercel.com)
2. Proyecto de Supabase configurado
3. Repositorio en GitHub

## 🔧 Configuración

### 1. Importar el proyecto en Vercel

1. Ve a https://vercel.com/new
2. Selecciona el repositorio `juan-altamira/nutri-track`
3. Configura el proyecto:
   - **Framework Preset**: SvelteKit
   - **Root Directory**: `apps/web-svelte`
   - **Build Command**: `pnpm run build` (detectado automáticamente)
   - **Output Directory**: `.svelte-kit` (detectado automáticamente)

### 2. Configurar Variables de Entorno

En la sección "Environment Variables" de Vercel, agrega las siguientes variables:

#### Variables Requeridas

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `PUBLIC_SUPABASE_URL` | `https://pjtizyzmhywcujerhipa.supabase.co` | URL de tu proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Clave anónima de Supabase |

**Importante**: Estas variables deben tener el prefijo `PUBLIC_` para ser accesibles en el cliente de SvelteKit.

#### Dónde obtener los valores

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/pjtizyzmhywcujerhipa
2. Navega a **Settings** → **API**
3. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon/public key** → `PUBLIC_SUPABASE_ANON_KEY`

### 3. Configuración Avanzada (Opcional)

#### Build Settings

```json
{
  "framework": "sveltekit",
  "buildCommand": "pnpm run build",
  "outputDirectory": ".svelte-kit",
  "installCommand": "pnpm install",
  "devCommand": "pnpm run dev"
}
```

#### Node.js Version

Vercel detectará automáticamente la versión de Node.js desde el `package.json` o usará la versión LTS más reciente.

### 4. Deploy

1. Haz clic en **Deploy**
2. Espera a que se complete el build (2-3 minutos)
3. Una vez completado, Vercel te dará una URL de producción

## 🔍 Solución de Problemas

### Error: Variables de entorno no definidas

**Síntoma**: 
```
"PUBLIC_SUPABASE_URL" is not exported by "virtual:env/static/public"
```

**Solución**:
1. Ve a **Settings** → **Environment Variables** en tu proyecto de Vercel
2. Asegúrate de que las variables tengan el prefijo `PUBLIC_`
3. Redeploy el proyecto

### Error: Build failed

**Solución**:
1. Verifica que el Root Directory sea `apps/web-svelte`
2. Asegúrate de que todas las dependencias estén en `package.json`
3. Revisa los logs de build en Vercel

### Error: Supabase connection failed

**Solución**:
1. Verifica que la URL de Supabase sea correcta
2. Confirma que la anon key no haya expirado
3. Revisa las configuraciones de CORS en Supabase

## 🌐 Dominios Personalizados

### Agregar un dominio

1. Ve a **Settings** → **Domains**
2. Agrega tu dominio personalizado
3. Configura los registros DNS según las instrucciones de Vercel
4. Espera a que se propague el DNS (puede tomar hasta 48 horas)

### Configurar SSL

Vercel automáticamente provisiona certificados SSL gratuitos a través de Let's Encrypt.

## 📊 Monitoreo

### Analytics

Vercel proporciona analytics integrados:
- Visitas de página
- Rendimiento (Core Web Vitals)
- Errores de servidor

Accede en: **Analytics** en tu proyecto de Vercel

### Logs

Para ver logs en tiempo real:
1. Ve a **Deployments**
2. Selecciona el deployment activo
3. Haz clic en **View Function Logs**

## 🔄 CI/CD

Vercel automáticamente:
- ✅ Crea previews para cada Pull Request
- ✅ Deploya a producción en cada push a `main`
- ✅ Ejecuta los tests antes del deploy (si están configurados)

### Protección de Rama

Para evitar deploys accidentales:
1. Ve a **Settings** → **Git**
2. Configura **Production Branch** a `main`
3. Habilita **Auto Preview for All Branches**

## 🚀 Optimizaciones

### Performance

- Vercel usa CDN global automáticamente
- Compresión Brotli habilitada por defecto
- Caché de assets estáticos optimizado

### Recomendaciones

1. Habilita **Image Optimization** para imágenes
2. Usa **Edge Functions** para endpoints de API rápidos
3. Configura **Caching Headers** apropiados

## 📚 Recursos

- [Documentación de Vercel para SvelteKit](https://vercel.com/docs/frameworks/sveltekit)
- [SvelteKit Adapter Vercel](https://kit.svelte.dev/docs/adapter-vercel)
- [Guía de Variables de Entorno en Vercel](https://vercel.com/docs/projects/environment-variables)

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs de deployment en Vercel
2. Consulta la documentación de SvelteKit
3. Verifica la configuración de Supabase
4. Crea un issue en el repositorio

---

**Última actualización**: Octubre 2025
