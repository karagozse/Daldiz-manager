import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDto } from '../users/dto/user.dto';
import * as bcrypt from 'bcrypt';

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    role: string;
    email: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    tenantId: string,
    username: string,
    password: string,
  ): Promise<UserDto | null> {
    const user = await this.usersService.findByUsername(tenantId, username);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Return UserDto without passwordHash
    const { passwordHash, ...userDto } = user;
    return userDto as UserDto;
  }

  async login(
    loginDto: LoginDto,
    tenant: { tenantId: string; tenantKey: string },
  ): Promise<AuthResponse> {
    const user = await this.validateUser(
      tenant.tenantId,
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      tenantId: tenant.tenantId,
    };

    // Generate access token
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        email: user.email,
      },
    };
  }

  async validateUserById(userId: number): Promise<UserDto | null> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  async validateUserByIdAndTenant(
    userId: number,
    tenantId: string,
  ): Promise<UserDto | null> {
    const user = await this.usersService.findByIdAndTenant(userId, tenantId);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }
}
