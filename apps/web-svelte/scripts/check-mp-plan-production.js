// Script para verificar plan de producción
const ACCESS_TOKEN = 'APP_USR-3247172230150643-101823-a0adc23899a27f1b52ee3602f1e92ea1-762286284';
const PLAN_ID = '98f66b2d5c97438592f97a42d6dc9165';

async function checkPlan() {
  console.log('🔍 Verificando plan de producción:', PLAN_ID);
  
  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval_plan/${PLAN_ID}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Plan encontrado:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('\n❌ Error:');
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error de red:', error);
  }
}

checkPlan();
