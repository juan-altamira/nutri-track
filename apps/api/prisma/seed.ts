import { PrismaClient, FoodSource } from '../generated/prisma';

const prisma = new PrismaClient();

const foodData = [
  {
    name: 'Semillas de Chía',
    calories: 486,
    protein: 16.54,
    fat: 30.74,
    carbohydrates: 42.12,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Semillas de Lino',
    calories: 534,
    protein: 18,
    fat: 42,
    carbohydrates: 29,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Semillas de Girasol',
    calories: 584,
    protein: 20.8,
    fat: 51.5,
    carbohydrates: 20,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Garbanzos Crudos',
    calories: 378,
    protein: 20.45,
    fat: 6.05,
    carbohydrates: 62.95,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Semillas de Sésamo',
    calories: 573,
    protein: 17.73,
    fat: 49.67,
    carbohydrates: 23.45,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Semillas de Calabaza',
    calories: 446,
    protein: 19,
    fat: 19,
    carbohydrates: 54,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Almendras',
    calories: 579,
    protein: 21.15,
    fat: 49.93,
    carbohydrates: 21.55,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Nueces',
    calories: 654,
    protein: 15.23,
    fat: 65.21,
    carbohydrates: 13.71,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Huevo Entero',
    calories: 143,
    protein: 12.56,
    fat: 9.51,
    carbohydrates: 0.72,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Banana',
    calories: 97,
    protein: 0.74,
    fat: 0.29,
    carbohydrates: 23,
    source: FoodSource.GLOBAL,
  },
  {
    name: 'Leche Entera de Vaca',
    calories: 60,
    protein: 3.2,
    fat: 3.26,
    carbohydrates: 4.8,
    source: FoodSource.GLOBAL,
  },
];

async function main() {
  console.log(`Start seeding ...`);
  for (const f of foodData) {
    const existingFood = await prisma.food.findFirst({
      where: {
        name: f.name,
        creatorId: null,
      },
    });

    if (!existingFood) {
      const food = await prisma.food.create({
        data: f,
      });
      console.log(`Created food with id: ${food.id}`);
    } else {
      console.log(`Food '${f.name}' already exists. Skipping.`);
    }
  }
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
