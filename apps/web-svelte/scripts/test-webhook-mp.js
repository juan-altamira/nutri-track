/**
 * Script para diagnosticar webhooks de Mercado Pago
 * 
 * Verifica:
 * 1. Si el endpoint está accesible públicamente
 * 2. Si responde correctamente a GET (ping de MP)
 * 3. Configuración actual de webhooks en MP
 */

import 'dotenv/config';

const WEBHOOK_URL = 'https://www.nutri-track.pro/api/webhooks/mercadopago';
const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const APP_ID = '3247172230150643';

console.log('🔍 DIAGNÓSTICO DE WEBHOOKS MERCADO PAGO\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Verificar que el endpoint esté accesible
console.log('1️⃣ Verificando accesibilidad del webhook...');
console.log(`   URL: ${WEBHOOK_URL}\n`);

try {
  const response = await fetch(WEBHOOK_URL);
  const data = await response.json();
  
  console.log(`   ✅ Endpoint accesible`);
  console.log(`   Status: ${response.status}`);
  console.log(`   Response:`, data);
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 2. Obtener configuración actual de webhooks
console.log('2️⃣ Obteniendo configuración de webhooks en MP...\n');

if (!ACCESS_TOKEN) {
  console.error('❌ No hay ACCESS_TOKEN en .env');
  process.exit(1);
}

try {
  const response = await fetch(
    `https://api.mercadopago.com/v1/webhooks/${APP_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    }
  );

  if (response.status === 404) {
    console.log('   ⚠️  No hay webhooks configurados para esta aplicación');
    console.log('   Necesitás configurarlos manualmente en el panel de MP\n');
  } else if (response.ok) {
    const webhooks = await response.json();
    console.log('   ✅ Webhooks configurados:');
    console.log(JSON.stringify(webhooks, null, 2));
  } else {
    console.error(`   ❌ Error: ${response.status}`);
    const error = await response.text();
    console.error(`   ${error}`);
  }
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 3. Instrucciones
console.log('📋 PRÓXIMOS PASOS:\n');
console.log('1. Ir a: https://www.mercadopago.com.ar/developers/panel/app');
console.log('2. Seleccionar tu aplicación');
console.log('3. Ir a "Webhooks" en el menú lateral');
console.log('4. Hacer clic en "Configurar notificaciones"');
console.log('5. Agregar URL:');
console.log(`   ${WEBHOOK_URL}`);
console.log('6. Seleccionar eventos:');
console.log('   - ✅ Pagos (payment)');
console.log('   - ✅ Suscripciones (subscription_preapproval)');
console.log('   - ✅ Planes (subscription_preapproval_plan)');
console.log('7. Guardar');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
