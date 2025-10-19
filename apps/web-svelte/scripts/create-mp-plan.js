/**
 * Script para crear el plan de suscripción en Mercado Pago
 * Solo se ejecuta UNA VEZ para crear el plan
 */

const MERCADOPAGO_ACCESS_TOKEN = 'TEST-3247172230150643-101823-e9e6b6185fb1cef0773a3494ece5fea3-762286284';

async function createSubscriptionPlan() {
  try {
    console.log('🚀 Creando plan de suscripción en Mercado Pago...\n');

    const planData = {
      reason: 'Nutri-Track - Suscripción Mensual',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 9900, // ARS 9,900
        currency_id: 'ARS',
        free_trial: {
          frequency: 14,
          frequency_type: 'days'
        }
      },
      back_url: 'https://www.nutri-track.pro/subscription/success',
    };

    const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(planData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error al crear plan:');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log('✅ Plan creado exitosamente!\n');
    console.log('📋 Detalles del plan:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID del Plan: ${result.id}`);
    console.log(`Nombre: ${result.reason}`);
    console.log(`Precio: ARS ${result.auto_recurring.transaction_amount}`);
    console.log(`Frecuencia: ${result.auto_recurring.frequency} ${result.auto_recurring.frequency_type}`);
    console.log(`Trial: ${result.auto_recurring.free_trial.frequency} ${result.auto_recurring.free_trial.frequency_type}`);
    console.log(`Status: ${result.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔧 Siguiente paso:');
    console.log('Agregá este ID a tu .env:');
    console.log(`MERCADOPAGO_PLAN_ID=${result.id}\n`);

    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSubscriptionPlan();
