/**
 * Script para crear suscripción manualmente en Supabase
 * 
 * USO TEMPORAL: Solo usar si el webhook de MP no llega
 * 
 * Uso:
 *   node scripts/create-subscription-manual-mp.js [user_email] [preapproval_id]
 * 
 * Ejemplo:
 *   node scripts/create-subscription-manual-mp.js juampiluduena@gmail.com 2c9380848cd92805018cdae4ac5f03f1
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const userEmail = args[0];
const preapprovalId = args[1];

if (!userEmail || !preapprovalId) {
  console.error('❌ Uso: node scripts/create-subscription-manual-mp.js [email] [preapproval_id]');
  console.error('\nEjemplo:');
  console.error('  node scripts/create-subscription-manual-mp.js juampiluduena@gmail.com 2c9380...');
  process.exit(1);
}

console.log('🔧 CREAR SUSCRIPCIÓN MANUAL - MERCADO PAGO\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function main() {
  // 1. Obtener User ID desde email
  console.log(`1️⃣ Buscando usuario con email: ${userEmail}...`);
  
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (userError) {
    console.error('❌ Error obteniendo usuarios:', userError);
    process.exit(1);
  }
  
  const targetUser = user.users.find(u => u.email === userEmail);
  
  if (!targetUser) {
    console.error(`❌ No se encontró usuario con email: ${userEmail}`);
    process.exit(1);
  }
  
  const userId = targetUser.id;
  console.log(`✅ Usuario encontrado: ${userId}\n`);
  
  // 2. Obtener info de la suscripción desde MP
  console.log(`2️⃣ Obteniendo info de suscripción de Mercado Pago...`);
  console.log(`   Preapproval ID: ${preapprovalId}`);
  
  const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    console.error(`❌ Error al obtener preapproval: ${response.status}`);
    const error = await response.text();
    console.error(error);
    process.exit(1);
  }
  
  const preapprovalInfo = await response.json();
  
  console.log(`✅ Suscripción obtenida:`);
  console.log(`   Status: ${preapprovalInfo.status}`);
  console.log(`   Payer ID: ${preapprovalInfo.payer_id}`);
  console.log(`   Payer Email: ${preapprovalInfo.payer_email}`);
  console.log(`   Próximo pago: ${preapprovalInfo.next_payment_date}`);
  console.log('');
  
  // 3. Verificar si ya existe
  console.log(`3️⃣ Verificando si ya existe suscripción...`);
  
  const { data: existingSub } = await supabaseAdmin
    .from('Subscription')
    .select('*')
    .eq('userId', userId)
    .single();
  
  if (existingSub) {
    console.log('⚠️  Ya existe una suscripción para este usuario:');
    console.log(`   ID: ${existingSub.id}`);
    console.log(`   Status: ${existingSub.status}`);
    console.log(`   Provider: ${existingSub.paymentProvider}`);
    console.log(`   MP Subscription ID: ${existingSub.mercadopagoSubscriptionId || 'N/A'}`);
    console.log('');
    
    const readline = await import('readline').then(m => m.default);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('¿Actualizar esta suscripción? (s/n): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      process.exit(0);
    }
    
    // Actualizar existente
    console.log('\n4️⃣ Actualizando suscripción existente...');
    
    const { error: updateError } = await supabaseAdmin
      .from('Subscription')
      .update({
        status: 'on_trial',
        paymentProvider: 'mercadopago',
        mercadopagoSubscriptionId: preapprovalId,
        mercadopagoCustomerId: String(preapprovalInfo.payer_id),
        region: 'argentina',
        renewsAt: preapprovalInfo.next_payment_date,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existingSub.id);
    
    if (updateError) {
      console.error('❌ Error actualizando:', updateError);
      process.exit(1);
    }
    
    console.log('✅ Suscripción actualizada exitosamente\n');
    
  } else {
    // Crear nueva
    console.log('✅ No existe suscripción previa\n');
    console.log('4️⃣ Creando nueva suscripción...');
    
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const { data: newSub, error: createError } = await supabaseAdmin
      .from('Subscription')
      .insert({
        userId: userId,
        status: 'on_trial',
        paymentProvider: 'mercadopago',
        mercadopagoSubscriptionId: preapprovalId,
        mercadopagoCustomerId: String(preapprovalInfo.payer_id),
        region: 'argentina',
        trialEndsAt: trialEndsAt.toISOString(),
        renewsAt: preapprovalInfo.next_payment_date || trialEndsAt.toISOString(),
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creando suscripción:', createError);
      process.exit(1);
    }
    
    console.log('✅ Suscripción creada exitosamente');
    console.log(`   ID: ${newSub.id}\n`);
  }
  
  // 5. Verificar
  console.log('5️⃣ Verificación final...');
  
  const { data: finalSub } = await supabaseAdmin
    .from('Subscription')
    .select('*')
    .eq('userId', userId)
    .single();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SUSCRIPCIÓN CONFIGURADA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Email:      ${userEmail}`);
  console.log(`User ID:    ${userId}`);
  console.log(`Status:     ${finalSub.status}`);
  console.log(`Provider:   ${finalSub.paymentProvider}`);
  console.log(`MP Sub ID:  ${finalSub.mercadopagoSubscriptionId}`);
  console.log(`Trial ends: ${finalSub.trialEndsAt}`);
  console.log(`Renews at:  ${finalSub.renewsAt}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ El usuario ahora puede acceder al dashboard\n');
}

main().catch(console.error);
