import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Role, Sex } from '../../generated/prisma';

export class SignUpDto {
  @IsEmail({}, { message: 'El email proporcionado no es válido.' })
  @IsNotEmpty({ message: 'El email no puede estar vacío.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  name: string;

  @IsEnum(Role)
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  role: Role;

  @IsOptional()
  @IsInt({ message: 'La edad debe ser un número entero.' })
  @Min(1, { message: 'La edad debe ser como mínimo 1.' })
  @Max(120, { message: 'La edad no puede ser mayor a 120.' })
  age?: number;

  @IsOptional()
  @IsEnum(Sex, { message: 'El sexo debe ser MALE o FEMALE.' })
  sex?: Sex;
}
