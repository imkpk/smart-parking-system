import { Role } from '@prisma/client';

export class UserResponseDto {
  id: number;

  name: string;

  email: string | null;

  phone: string | null;

  role: Role;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export class AuthResponseDto {
  user: UserResponseDto;

  accessToken: string;
}
