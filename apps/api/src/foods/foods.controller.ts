import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, FoodSource } from '../generated/prisma';

@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER)
  create(@Body() createFoodDto: CreateFoodDto, @Request() req) {
    const creatorId = req.user.id;
    return this.foodsService.create(createFoodDto, creatorId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Request() req, @Query('source') source?: FoodSource) {
    const userId = req.user.id;
    return this.foodsService.findAll(userId, source);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  search(@Query('q') query: string, @Request() req) {
    const userId = req.user.id;
    return this.foodsService.search(query, userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER)
  update(
    @Param('id') id: string,
    @Body() updateFoodDto: UpdateFoodDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.foodsService.update(id, updateFoodDto, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.foodsService.remove(id, userId);
  }
}
