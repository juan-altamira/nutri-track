import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { FoodsModule } from './foods/foods.module';
import { FoodLogsModule } from './food-logs/food-logs.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ClientsModule, FoodsModule, FoodLogsModule], // Import the PrismaModule
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
