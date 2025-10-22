/**
 * Script para buscar suscripciones en Mercado Pago
 * 
 * Busca todas las suscripciones recientes y muestra sus IDs
 */

import 'dotenv/config';

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!MP_ACCESS_TOKEN) {
  console.error('❌ No hay MERCADOPAGO_ACCESS_TOKEN en .env');
  process.exit(1);
}

console.log('🔍 BUSCAR SUSCRIPCIONES EN MERCADO PAGO\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function main() {
  console.log('Buscando suscripciones...\n');
  
  // Buscar suscripciones recientes
  const response = await fetch(
    'https://api.mercadopago.com/preapproval/search?sort=date_created&criteria=desc&limit=50',
    {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
    }
  );
  
  if (!response.ok) {
    console.error(`❌ Error: ${response.status}`);
    const error = await response.text();
    console.error(error);
    process.exit(1);
  }
  
  const data = await response.json();
  
  if (!data.results || data.results.length === 0) {
    console.log('⚠️  No se encontraron suscripciones');
    console.log('\nPosibles razones:');
    console.log('1. Estás usando credenciales TEST pero pagaste en PRODUCCIÓN');
    console.log('2. O no hay suscripciones creadas todavía');
    console.log('\nVerificá las credenciales en el .env');
    process.exit(0);
  }
  
  console.log(`✅ Encontradas ${data.results.length} suscripciones:\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  data.results.forEach((sub, index) => {
    console.log(`${index + 1}. Suscripción`);
    console.log(`   ID: ${sub.id}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Razón: ${sub.reason}`);
    console.log(`   Email: ${sub.payer_email || 'N/A'}`);
    console.log(`   External Ref: ${sub.external_reference || 'N/A'}`);
    console.log(`   Fecha creación: ${sub.date_created}`);
    console.log(`   Próximo pago: ${sub.next_payment_date || 'N/A'}`);
    console.log(`   Monto: $${sub.auto_recurring?.transaction_amount || 'N/A'} ${sub.auto_recurring?.currency_id || ''}`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Para crear la suscripción en Supabase, ejecutá:\n');
  console.log('   node scripts/create-subscription-manual-mp.js \\');
  console.log('     [email] \\');
  console.log('     [preapproval_id]\n');
  console.log('Ejemplo:');
  console.log(`   node scripts/create-subscription-manual-mp.js \\`);
  console.log(`     ${data.results[0]?.payer_email || 'tu@email.com'} \\`);
  console.log(`     ${data.results[0]?.id || 'preapproval_id'}\n`);
}

main().catch(console.error);
