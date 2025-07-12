import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto, ownerId: string) {
    const { email, password, name, age, sex } = createClientDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este email.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        age,
        sex,
        role: 'CLIENT',
        owner: {
          connect: { id: ownerId },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = client;
    return result;
  }

  async findAllForOwner(ownerId: string) {
    const clients = await this.prisma.user.findMany({
      where: {
        ownerId: ownerId,
        role: 'CLIENT',
      },
    });

    // Exclude password from each client object
    return clients.map((client) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = client;
      return result;
    });
  }
}
