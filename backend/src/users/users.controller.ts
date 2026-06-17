import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from './types/safe-user.type';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: SafeUser, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id, currentUser);
  }
}
