import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcryptjs';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, name, role, age, sex } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este email.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        age,
        sex,
        trialEndsAt,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async signIn(signInDto: SignInDto) {
    console.log('Intento de login:', signInDto.email);

    const { email, password } = signInDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('Usuario no encontrado');
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    console.log('Hash guardado:', user.password);
    const isPasswordMatching = await bcrypt.compare(password, user.password);
    console.log('Resultado bcrypt.compare:', isPasswordMatching);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

