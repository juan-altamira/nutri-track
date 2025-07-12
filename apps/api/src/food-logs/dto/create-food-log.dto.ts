import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateFoodLogDto {
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @IsNumber()
  @Min(0.01) // Quantity must be a positive number
  quantity: number;

  @IsDateString()
  date: string;
}
