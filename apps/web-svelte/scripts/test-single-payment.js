// Script para probar si un pago ÚNICO funciona (no suscripción)
const ACCESS_TOKEN = 'APP_USR-3247172230150643-101823-a0adc23899a27f1b52ee3602f1e92ea1-762286284';

async function createSinglePayment() {
  console.log('🧪 Creando preferencia de pago único para prueba...');
  
  const preferenceData = {
    items: [
      {
        title: 'Nutri-Track - Prueba de Pago Único',
        quantity: 1,
        unit_price: 100, // ARS 100 para prueba
        currency_id: 'ARS',
      }
    ],
    back_urls: {
      success: 'https://www.nutri-track.pro/subscription/success',
      failure: 'https://www.nutri-track.pro/subscription',
      pending: 'https://www.nutri-track.pro/subscription',
    },
    auto_return: 'approved',
    statement_descriptor: 'Nutri-Track',
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Preferencia de pago único creada!');
      console.log('\n📋 Datos:');
      console.log('ID:', result.id);
      console.log('Status:', result.status);
      console.log('\n🔗 URL de pago de prueba:');
      console.log(result.init_point);
      console.log('\n👉 Abrí esta URL en el navegador y probá hacer un pago de ARS 100');
      console.log('Si este funciona, el problema es específico de suscripciones.');
      console.log('Si este también falla, el problema es general de la cuenta MP.');
    } else {
      console.error('\n❌ Error:');
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error de red:', error);
  }
}

createSinglePayment();
