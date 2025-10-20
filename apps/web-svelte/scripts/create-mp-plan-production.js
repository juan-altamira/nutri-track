// Script para crear plan de suscripción en Mercado Pago PRODUCCIÓN
const ACCESS_TOKEN = 'APP_USR-3247172230150643-101823-a0adc23899a27f1b52ee3602f1e92ea1-762286284';

async function createSubscriptionPlan() {
  console.log('🚀 Creando plan de suscripción en PRODUCCIÓN...');
  
  const planData = {
    reason: 'Nutri-Track - Suscripción Mensual',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 9900,
      currency_id: 'ARS',
      free_trial: {
        frequency: 14,
        frequency_type: 'days',
      }
    },
    back_url: 'https://www.nutri-track.pro/subscription/success',
    payment_methods_allowed: {
      payment_types: [
        { id: 'credit_card' },
        { id: 'debit_card' }
      ],
      payment_methods: []
    }
  };

  try {
    const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(planData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Plan de PRODUCCIÓN creado exitosamente!');
      console.log('\n📋 Datos del plan:');
      console.log('-----------------------------------');
      console.log('ID del Plan:', result.id);
      console.log('Estado:', result.status);
      console.log('Precio:', `ARS ${result.auto_recurring.transaction_amount / 100}`);
      console.log('Frecuencia:', `${result.auto_recurring.frequency} ${result.auto_recurring.frequency_type}`);
      console.log('Trial:', `${result.auto_recurring.free_trial.frequency} ${result.auto_recurring.free_trial.frequency_type}`);
      console.log('Init Point:', result.init_point);
      console.log('-----------------------------------');
      console.log('\n⚙️  ACCIÓN REQUERIDA:');
      console.log('Agregá esta variable en Vercel:');
      console.log(`MERCADOPAGO_PLAN_ID=${result.id}`);
      console.log('\n(Reemplazá el valor anterior que era de TEST)');
    } else {
      console.error('\n❌ Error al crear el plan:');
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error de red:', error);
  }
}

createSubscriptionPlan();
