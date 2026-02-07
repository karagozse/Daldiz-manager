import { Role } from '@prisma/client';

export class UserDto {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
