import { Controller, Post, Body, UseGuards, Request, Get, Query, Delete, Param } from '@nestjs/common';
import { FoodLogsService } from './food-logs.service';
import { CreateFoodLogDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('food-logs')
export class FoodLogsController {
  constructor(private readonly foodLogsService: FoodLogsService) {}

  @Post()
  create(@Body() createFoodLogDto: CreateFoodLogDto, @GetUser('id') userId: string) {
    return this.foodLogsService.create(createFoodLogDto, userId);
  }

  @Get()
  findAllByDate(@GetUser('id') userId: string, @Query('date') date: string) {
    return this.foodLogsService.findAllByDate(userId, date);
  }

  @Get('summary')
  getSummaryByDate(@GetUser('id') userId: string, @Query('date') date: string) {
    return this.foodLogsService.getSummaryByDate(userId, date);
  }

  @Delete(':id')
  remove(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.foodLogsService.remove(userId, id);
  }
}
