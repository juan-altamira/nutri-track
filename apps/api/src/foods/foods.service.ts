import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { FoodSource } from '../generated/prisma';

@Injectable()
export class FoodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFoodDto: CreateFoodDto, creatorId: string) {
    const food = await this.prisma.food.create({
      data: {
        ...createFoodDto,
        source: FoodSource.CUSTOM,
        creator: {
          connect: { id: creatorId },
        },
      },
    });
    return food;
  }

  async findAll(creatorId: string, source?: FoodSource) {
    // If a specific source is requested (e.g., 'CUSTOM' or 'GLOBAL')
    if (source) {
      const whereClause: { source: FoodSource; creatorId?: string } = {
        source,
      };

      // If the source is CUSTOM, only return foods created by the requesting user
      if (source === FoodSource.CUSTOM) {
        whereClause.creatorId = creatorId;
      }

      return this.prisma.food.findMany({
        where: whereClause,
      });
    }

    // If no source is specified, fetch global and user's custom foods separately and combine
    const globalFoods = this.prisma.food.findMany({
      where: { source: FoodSource.GLOBAL },
    });

    const customFoods = this.prisma.food.findMany({
      where: {
        source: FoodSource.CUSTOM,
        creatorId: creatorId,
      },
    });

    const [globalResults, customResults] = await Promise.all([
      globalFoods,
      customFoods,
    ]);

    return [...globalResults, ...customResults];
  }

  async search(query: string, creatorId: string) {
    if (!query || query.trim() === '') {
      return [];
    }

    return this.prisma.food.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
        OR: [
          { source: FoodSource.GLOBAL },
          { creatorId: creatorId },
        ],
      },
      take: 20, // Limit results for performance
    });
  }

  async update(
    id: string,
    updateFoodDto: UpdateFoodDto,
    userId: string,
  ) {
    const food = await this.prisma.food.findUnique({
      where: { id },
    });

    if (!food) {
      throw new NotFoundException(`No se encontró un alimento con el ID "${id}".`);
    }

    // Security check: Only the creator can update the food
    if (food.creatorId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este alimento.',
      );
    }

    return this.prisma.food.update({
      where: { id },
      data: updateFoodDto,
    });
  }

  async remove(id: string, userId: string) {
    const food = await this.prisma.food.findUnique({
      where: { id },
    });

    if (!food) {
      throw new NotFoundException(`No se encontró un alimento con el ID "${id}".`);
    }

    // Security check: Only the creator can delete the food
    if (food.creatorId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este alimento.',
      );
    }

    return this.prisma.food.delete({ where: { id } });
  }
}
