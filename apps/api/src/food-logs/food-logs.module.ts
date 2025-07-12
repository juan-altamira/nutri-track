import { Module } from '@nestjs/common';
import { FoodLogsService } from './food-logs.service';
import { FoodLogsController } from './food-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FoodLogsController],
  providers: [FoodLogsService],
})
export class FoodLogsModule {}
