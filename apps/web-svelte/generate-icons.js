/**
 * Script para generar iconos de PWA en diferentes tamaños
 * 
 * Este script crea iconos SVG simples con el logo de Nutri-Track.
 * Para producción, se recomienda usar herramientas como:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 * 
 * Uso: node generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'static', 'icons');

// Crear directorio de iconos si no existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG base del icono
const createSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo con gradiente -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo redondeado -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  
  <!-- Icono de plato con cubiertos (representando nutrición) -->
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size / 100})">
    <!-- Plato -->
    <circle cx="30" cy="30" r="22" fill="none" stroke="white" stroke-width="3"/>
    <circle cx="30" cy="30" r="15" fill="none" stroke="white" stroke-width="2"/>
    
    <!-- Tenedor -->
    <line x1="10" y1="10" x2="10" y2="25" stroke="white" stroke-width="2"/>
    <line x1="7" y1="10" x2="7" y2="18" stroke="white" stroke-width="1.5"/>
    <line x1="13" y1="10" x2="13" y2="18" stroke="white" stroke-width="1.5"/>
    
    <!-- Cuchillo -->
    <line x1="50" y1="10" x2="50" y2="25" stroke="white" stroke-width="2"/>
    <path d="M 48 10 L 52 10 L 50 15 Z" fill="white"/>
  </g>
  
  <!-- Texto (solo en iconos grandes) -->
  ${size >= 144 ? `<text x="${size/2}" y="${size * 0.85}" font-family="Arial, sans-serif" font-size="${size * 0.12}" font-weight="bold" fill="white" text-anchor="middle">Nutri-Track</text>` : ''}
</svg>`;

// Generar iconos SVG
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.png`;
  const svgFilename = `icon-${size}x${size}.svg`;
  const svgPath = path.join(iconsDir, svgFilename);
  
  // Guardar SVG
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generado: ${svgFilename}`);
});

console.log('\n✅ Iconos SVG generados exitosamente en static/icons/');
console.log('\n⚠️  NOTA: Los archivos .svg fueron creados.');
console.log('Para producción, convierte los SVG a PNG usando:');
console.log('  - ImageMagick: convert icon.svg icon.png');
console.log('  - Inkscape: inkscape icon.svg --export-png=icon.png');
console.log('  - Herramientas online: realfavicongenerator.net o pwabuilder.com\n');
