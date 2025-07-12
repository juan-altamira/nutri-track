import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodLogDto } from './dto';

@Injectable()
export class FoodLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFoodLogDto: CreateFoodLogDto, userId: string) {
    const { foodId, quantity, date } = createFoodLogDto;

    // Verify the food exists before logging it
    const food = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new NotFoundException(`Food with ID "${foodId}" not found.`);
    }

    return this.prisma.foodLog.create({
      data: {
        quantity,
        date: new Date(date),
        user: {
          connect: { id: userId },
        },
        food: {
          connect: { id: foodId },
        },
      },
    });
  }

  async findAllByDate(userId: string, date: string) {
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    return this.prisma.foodLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        food: true, // Include the full food details
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private getAgeGroup(age: number): string {
    if (age >= 4 && age <= 8) return '4-8';
    if (age >= 9 && age <= 13) return '14-18'; // Closest group
    if (age >= 14 && age <= 18) return '14-18';
    if (age >= 19 && age <= 50) return '19-50';
    if (age >= 51 && age <= 70) return '19-50'; // Closest group
    if (age >= 71) return '71+';
    throw new BadRequestException(`Age ${age} is outside the supported RDA range.`);
  }

  async getSummaryByDate(userId: string, date: string) {
    const foodLogs = await this.findAllByDate(userId, date);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.age || !user.sex) {
      throw new BadRequestException('User profile (age and sex) is incomplete.');
    }

    const ageGroup = this.getAgeGroup(user.age);

    const totals = foodLogs.reduce((acc, log) => {
      const ratio = log.quantity / 100;
      Object.keys(log.food).forEach(key => {
        if (typeof log.food[key] === 'number') {
          acc[key] = (acc[key] || 0) + log.food[key] * ratio;
        }
      });
      return acc;
    }, {});

    const rdaTargets = await this.prisma.recommendedDailyAllowance.findMany({
      where: {
        ageGroup,
        OR: [{ sex: user.sex }, { sex: null }],
      },
    });

    const summary = rdaTargets.map(rda => {
      const nutrientCamelCase = rda.nutrient.toLowerCase().replace(/_([a-z0-9])/g, g => g[1].toUpperCase());
      const totalConsumed = totals[nutrientCamelCase] || 0;
      const percentage = rda.value > 0 ? (totalConsumed / rda.value) * 100 : 0;

      return {
        nutrient: rda.nutrient,
        unit: rda.unit,
        total: totalConsumed,
        rda: rda.value,
        percentage,
      };
    });

    return {
      foodLogs,
      summary,
    };
  }
}
