// Script para verificar si el plan de Mercado Pago existe
const ACCESS_TOKEN = 'TEST-3247172230150643-101823-e9e6b6185fb1cef0773a3494ece5fea3-762286284';
const PLAN_ID = '5f11fe717d0640af84fe9fe47eae032d';

async function checkPlan() {
  console.log('Verificando plan:', PLAN_ID);
  
  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval_plan/${PLAN_ID}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Plan encontrado:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Error al obtener plan:');
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
  }
}

checkPlan();
