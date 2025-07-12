import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del alimento no puede estar vacío.' })
  name: string;

  @IsNumber({}, { message: 'La proteína debe ser un número.' })
  @Min(0, { message: 'La proteína no puede ser negativa.' })
  protein: number;

  @IsNumber({}, { message: 'Los carbohidratos deben ser un número.' })
  @Min(0, { message: 'Los carbohidratos no pueden ser negativos.' })
  carbohydrates: number;

  @IsNumber({}, { message: 'La grasa debe ser un número.' })
  @Min(0, { message: 'La grasa no puede ser negativa.' })
  fat: number;

  @IsNumber({}, { message: 'Las calorías deben ser un número.' })
  @Min(0, { message: 'Las calorías no pueden ser negativas.' })
  calories: number;

  // Micronutrients (Optional)
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminA?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminC?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminD?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminE?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminK?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB6?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB9?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB12?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB5?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB7?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  choline?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calcium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chloride?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chromium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  copper?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fluoride?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  iodine?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  iron?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  magnesium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  manganese?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  molybdenum?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phosphorus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  potassium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  selenium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  zinc?: number;
}
