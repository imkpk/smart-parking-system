import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { SafeUser } from './types/safe-user.type';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('summary')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  getSummary(@CurrentUser() currentUser: SafeUser) {
    return this.usersService.getSummary(currentUser);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  create(@CurrentUser() currentUser: SafeUser, @Body() createUserDto: CreateUserDto) {
    return this.usersService.createManagedUser(currentUser, createUserDto);
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  findOne(@CurrentUser() currentUser: SafeUser, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id, currentUser);
  }
}