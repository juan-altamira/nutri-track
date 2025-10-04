# PWA (Progressive Web App) - Nutri-Track 📱

Nutri-Track está configurada como una Progressive Web App completa que permite a los usuarios instalarla en sus dispositivos como si fuera una app nativa.

## ✨ Características Implementadas

### 1. Manifest Web App (`manifest.json`)
- ✅ Configuración completa de metadatos de la app
- ✅ Iconos en múltiples tamaños para diferentes dispositivos
- ✅ Modo standalone (se abre como app nativa)
- ✅ Theme color y background color
- ✅ Shortcuts para acceso rápido a secciones

### 2. Service Worker (`sw.js`)
- ✅ Caché de archivos estáticos
- ✅ Estrategias de caché (Network First, Cache First)
- ✅ Soporte offline básico
- ✅ Actualización automática de caché

### 3. Botón de Instalación
- ✅ Banner flotante en la parte inferior
- ✅ Detección automática del evento `beforeinstallprompt`
- ✅ Ocultación automática si ya está instalada
- ✅ Opción "Ahora no" con persistencia en localStorage
- ✅ Estado de carga durante instalación

### 4. Meta Tags PWA
- ✅ Meta tags para iOS (Apple)
- ✅ Meta tags para Android
- ✅ Theme color
- ✅ Viewport optimizado
- ✅ Apple Touch Icons

## 🚀 Instalación desde el Navegador

### Desktop (Chrome, Edge)
1. Abre la app en el navegador
2. Aparecerá un banner en la parte inferior con botón "Instalar"
3. Click en "Instalar"
4. La app se instalará y se abrirá en una ventana independiente

Alternativamente:
- Chrome: Icono de instalación en la barra de direcciones (⊕)
- Edge: Menú → Apps → Instalar esta app

### Móvil Android (Chrome)
1. Abre la app en Chrome
2. Aparecerá el banner de instalación
3. Toca "Instalar"
4. La app se agregará al cajón de aplicaciones

Alternativamente:
- Menú (⋮) → Agregar a pantalla de inicio

### Móvil iOS (Safari)
1. Abre la app en Safari
2. Toca el botón de compartir (□↑)
3. Desliza hacia abajo y selecciona "Agregar a pantalla de inicio"
4. Toca "Agregar"

**Nota**: iOS no muestra el banner automático, los usuarios deben agregarlo manualmente.

## 🔧 Configuración Técnica

### Estructura de Archivos

```
apps/web-svelte/
├── static/
│   ├── manifest.json          # Configuración de PWA
│   ├── sw.js                  # Service Worker
│   ├── icons/                 # Iconos de la app
│   │   ├── icon-16x16.png
│   │   ├── icon-32x32.png
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   └── robots.txt
├── src/
│   ├── app.html               # Meta tags de PWA
│   ├── lib/
│   │   └── components/
│   │       └── PWAInstallPrompt.svelte  # Componente de instalación
│   └── routes/
│       └── +layout.svelte     # Incluye PWAInstallPrompt
├── generate-icons.js          # Script para generar iconos
└── PWA_README.md             # Esta documentación
```

### Service Worker - Estrategias de Caché

#### Cache First (Assets Estáticos)
- Imágenes, estilos, scripts, fuentes
- Sirve desde caché si existe, sino descarga
- Ideal para contenido que no cambia frecuentemente

#### Network First (API de Supabase)
- Solicitudes a supabase.co
- Intenta red primero, fallback a caché
- Mantiene datos actualizados

#### Caché Estático
- `/`, `/manifest.json`, `/robots.txt`
- Cacheados durante la instalación del SW
- Permiten navegación básica offline

## 📊 Verificación de PWA

### Chrome DevTools

1. Abre Chrome DevTools (F12)
2. Ve a la pestaña **Application**
3. Revisa:
   - **Manifest**: Verifica que manifest.json se cargue
   - **Service Workers**: Debe mostrar sw.js activo
   - **Cache Storage**: Verifica archivos cacheados
   - **Offline**: Prueba desconectando la red

### Lighthouse Audit

1. Chrome DevTools → Lighthouse
2. Selecciona "Progressive Web App"
3. Click "Generate report"
4. Objetivo: 90+ puntos

### PWA Checklist

- [ ] HTTPS habilitado (requerido en producción)
- [ ] Manifest válido
- [ ] Service Worker registrado
- [ ] Iconos en todos los tamaños
- [ ] Funciona offline (al menos parcialmente)
- [ ] Responde a gestos móviles
- [ ] Viewport configurado
- [ ] Theme color configurado

## 🌐 Soporte Offline

### Funcionalidades Offline Actuales

✅ **Disponible Offline**:
- Navegación básica de páginas visitadas
- Interfaz de usuario (HTML, CSS, JS)
- Assets estáticos cacheados

⚠️ **Limitado Offline**:
- Datos de Supabase (usa última versión cacheada)
- Búsqueda de alimentos (solo resultados cacheados)
- Login/Registro (requiere conexión)

❌ **No Disponible Offline**:
- Sincronización de nuevos datos
- Actualización de perfiles
- Carga de nuevos alimentos

### Mejoras Futuras para Offline

1. **IndexedDB para datos locales**
   - Almacenar alimentos offline
   - Logs de comida pendientes de sincronización
   - Perfiles de usuario

2. **Background Sync**
   - Sincronizar cuando vuelva la conexión
   - Encolar acciones realizadas offline

3. **Notificaciones Push**
   - Recordatorios de comidas
   - Metas nutricionales alcanzadas

## 🎨 Personalización

### Cambiar Colores de la PWA

En `static/manifest.json`:
```json
{
  "theme_color": "#2563eb",      // Color de la barra de estado
  "background_color": "#ffffff"   // Color de splash screen
}
```

En `src/app.html`:
```html
<meta name="theme-color" content="#2563eb" />
```

### Cambiar Nombre de la App

En `static/manifest.json`:
```json
{
  "name": "Nutri-Track",           // Nombre completo
  "short_name": "Nutri-Track",     // Nombre corto (homescreen)
  "description": "Tu descripción"
}
```

### Agregar Shortcuts

En `static/manifest.json`:
```json
{
  "shortcuts": [
    {
      "name": "Nueva sección",
      "url": "/ruta",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

## 🐛 Troubleshooting

### El banner de instalación no aparece

**Posibles causas**:
1. La app ya está instalada
2. No cumple criterios de PWA (verificar con Lighthouse)
3. El usuario cerró el banner antes (limpia localStorage)
4. Navegador no soporta PWA (iOS Safari requiere método manual)

**Solución**:
- Verifica Chrome DevTools → Application → Manifest
- Limpia localStorage: `localStorage.removeItem('pwa-banner-dismissed')`
- Verifica que sw.js esté registrado
- Prueba en modo incógnito

### Service Worker no se actualiza

**Solución**:
```javascript
// En PWAInstallPrompt.svelte, envía mensaje SKIP_WAITING
navigator.serviceWorker.ready.then((registration) => {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
});
```

O desregistra manualmente:
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

### Los iconos no se cargan

**Verifica**:
1. Archivos PNG reales en `static/icons/` (no SVG renombrados)
2. Rutas correctas en `manifest.json`
3. Tamaños correctos de archivos
4. Permisos de lectura de archivos

## 📈 Métricas y Analytics

### Eventos a Rastrear

- `pwa_install_prompted` - Banner mostrado
- `pwa_install_accepted` - Usuario instaló
- `pwa_install_dismissed` - Usuario cerró banner
- `pwa_launched_standalone` - App abierta como standalone

### Implementación (ejemplo con Google Analytics)

```javascript
// En PWAInstallPrompt.svelte
window.gtag?.('event', 'pwa_install_accepted', {
  event_category: 'PWA',
  event_label: 'Installation'
});
```

## 🔒 Seguridad

### HTTPS Requerido

PWA **requiere HTTPS** en producción (excepto `localhost`).

Vercel/Netlify proveen HTTPS automáticamente.

### Permisos

La PWA puede solicitar permisos para:
- Notificaciones push
- Ubicación (si se implementa)
- Cámara (para escanear códigos de barras, futuro)

## 📚 Recursos

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Web.dev - Learn PWA](https://web.dev/learn/pwa/)
- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

**Estado Actual**: ✅ PWA completamente funcional con instalación en un click, Service Worker activo, y soporte offline básico.
