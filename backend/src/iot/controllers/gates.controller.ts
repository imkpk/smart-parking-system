import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateGateDto } from '../dto/create-gate.dto';
import { UpdateGateDto } from '../dto/update-gate.dto';
import { GatesService } from '../services/gates.service';

@Controller('gates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GatesController {
  constructor(private readonly gatesService: GatesService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.gatesService.findAll(currentUser);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  create(@CurrentUser() currentUser: SafeUser, @Body() dto: CreateGateDto) {
    return this.gatesService.create(currentUser, dto);
  }

  @Get(':gateId')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findOne(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.gatesService.findOne(gateId, currentUser);
  }

  @Patch(':gateId')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  update(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: UpdateGateDto,
  ) {
    return this.gatesService.update(gateId, currentUser, dto);
  }

  @Delete(':gateId')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  remove(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.gatesService.remove(gateId, currentUser);
  }
}