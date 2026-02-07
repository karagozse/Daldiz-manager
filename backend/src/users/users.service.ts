import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByUsername(tenantId: string, username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { tenantId_username: { tenantId, username } },
    });
  }

  async findById(id: number): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        username: true,
        displayName: true,
        role: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async findByIdAndTenant(id: number, tenantId: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async findAll(tenantId: string): Promise<UserDto[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
