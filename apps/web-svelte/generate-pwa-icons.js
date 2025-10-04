/**
 * Script para generar iconos de PWA desde la imagen original
 * Uso: node generate-pwa-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'static', 'icons');
const sourceIcon = path.join(__dirname, 'static', 'Imagen-para-la-pwa.png');

// Verificar que la imagen de origen existe
if (!fs.existsSync(sourceIcon)) {
  console.error('❌ Error: No se encontró la imagen', sourceIcon);
  console.log('Por favor, asegúrate de que el archivo "Imagen-para-la-pwa.png" esté en la carpeta static/');
  process.exit(1);
}

console.log('📸 Imagen de origen:', sourceIcon);
console.log('📁 Directorio de destino:', iconsDir);
console.log('');

// Crear directorio de iconos si no existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Directorio de iconos creado');
}

// Generar iconos en todos los tamaños
async function generateIcons() {
  console.log('🎨 Generando iconos...\n');

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Fondo transparente
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ icon-${size}x${size}.png generado`);
    } catch (error) {
      console.error(`❌ Error generando icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\n🎉 ¡Iconos generados exitosamente!');
  console.log('\n📋 Archivos generados:');
  sizes.forEach(size => {
    const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   - icon-${size}x${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  });
}

generateIcons().catch(error => {
  console.error('❌ Error general:', error);
  process.exit(1);
});
