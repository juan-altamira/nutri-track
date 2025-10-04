# Generación de Iconos para PWA 🎨

Los iconos actuales en `static/icons/` son archivos SVG renombrados como PNG temporalmente para desarrollo. Para producción, necesitas generar PNG reales.

## 🚀 Método Recomendado (Rápido y Fácil)

### Opción 1: PWA Builder (Online)
1. Ve a https://www.pwabuilder.com/imageGenerator
2. Sube un logo/icono cuadrado de alta resolución (mínimo 512x512 px, recomendado 1024x1024 px)
3. Descarga el paquete de iconos generado
4. Extrae los archivos a `apps/web-svelte/static/icons/`

### Opción 2: Real Favicon Generator (Online)
1. Ve a https://realfavicongenerator.net/
2. Sube tu logo/icono
3. Configura las opciones para cada plataforma
4. Descarga el paquete completo
5. Copia los archivos PNG a `apps/web-svelte/static/icons/`

## 🛠️ Métodos Locales

### Con ImageMagick (Linux/Mac)
```bash
# Instalar ImageMagick
sudo apt install imagemagick  # Ubuntu/Debian
brew install imagemagick       # macOS

# Generar iconos desde SVG de alta calidad
cd apps/web-svelte/static/icons
for size in 16 32 72 96 128 144 152 192 384 512; do
  convert icon-source.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Con Inkscape (Linux/Mac/Windows)
```bash
# Instalar Inkscape
sudo apt install inkscape  # Ubuntu/Debian
brew install inkscape      # macOS
# Windows: descargar de https://inkscape.org/

# Convertir cada SVG a PNG
inkscape icon-16x16.svg --export-filename=icon-16x16.png -w 16 -h 16
inkscape icon-32x32.svg --export-filename=icon-32x32.png -w 32 -h 32
# ... repetir para cada tamaño
```

### Con Node.js (sharp)
```bash
# Instalar sharp
pnpm add -D sharp

# Crear script convert-icons.js
```

```javascript
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = './static/icons';
const sourceIcon = './static/icons/icon-source.png'; // Tu icono de alta resolución

sizes.forEach(async (size) => {
  await sharp(sourceIcon)
    .resize(size, size)
    .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  console.log(`✓ Generado icon-${size}x${size}.png`);
});
```

## 📋 Requisitos del Icono de Origen

Para mejores resultados, tu icono de origen debe:

- ✅ Ser **cuadrado** (relación de aspecto 1:1)
- ✅ Tener al menos **1024x1024 px** de resolución
- ✅ Tener fondo **transparente** o color sólido
- ✅ Tener elementos **centrados** con padding adecuado
- ✅ Ser legible en **tamaños pequeños** (16x16)
- ✅ Formato: PNG, SVG o JPG (PNG preferido)

## 🎨 Diseño del Icono Actual

El icono generado automáticamente muestra:
- Gradiente azul de fondo (#2563eb → #1d4ed8)
- Plato con círculos concéntricos (representando nutrición)
- Tenedor y cuchillo a los lados
- Texto "Nutri-Track" en iconos grandes (144px+)

## ✅ Checklist de Iconos Necesarios

- [ ] icon-16x16.png (favicon)
- [ ] icon-32x32.png (favicon)
- [ ] icon-72x72.png (Android)
- [ ] icon-96x96.png (Android)
- [ ] icon-128x128.png (Android)
- [ ] icon-144x144.png (Android)
- [ ] icon-152x152.png (iOS)
- [ ] icon-192x192.png (Android, requerido por PWA)
- [ ] icon-384x384.png (Android)
- [ ] icon-512x512.png (Android, splash screen, requerido por PWA)

## 🔍 Verificación

Después de generar los iconos, verifica que:

1. Todos los archivos PNG tengan el tamaño correcto:
```bash
cd static/icons
file icon-*.png | grep PNG
```

2. Los archivos no sean SVG renombrados:
```bash
file icon-192x192.png
# Debe decir: PNG image data, 192 x 192...
# NO debe decir: SVG Scalable Vector Graphics image
```

3. Los iconos se vean bien en diferentes tamaños
4. El manifest.json apunte a los archivos correctos

## 📱 Prueba tu PWA

Después de generar los iconos:

1. Ejecuta `pnpm dev` localmente
2. Abre Chrome DevTools → Application → Manifest
3. Verifica que todos los iconos se carguen correctamente
4. Verifica que no haya errores en la consola
5. Prueba la instalación en móvil y desktop

## 🚀 Deploy

Los iconos generados se incluirán automáticamente en el deploy de Vercel/Netlify porque están en la carpeta `static/`.

---

**Nota**: Los iconos SVG temporales funcionan en algunos navegadores, pero PNG reales son necesarios para compatibilidad completa con todos los dispositivos y navegadores.
