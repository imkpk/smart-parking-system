import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateVehicleAccessCredentialDto } from '../dto/create-vehicle-access-credential.dto';
import { VehicleAccessCredentialsService } from '../services/vehicle-access-credentials.service';

@Controller('vehicle-access-credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleAccessCredentialsController {
  constructor(
    private readonly vehicleAccessCredentialsService: VehicleAccessCredentialsService,
  ) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findAll(
    @CurrentUser() currentUser: SafeUser,
    @Query('vehicleId', new ParseIntPipe({ optional: true })) vehicleId?: number,
  ) {
    return this.vehicleAccessCredentialsService.findAll(currentUser, vehicleId);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  create(
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: CreateVehicleAccessCredentialDto,
  ) {
    return this.vehicleAccessCredentialsService.create(currentUser, dto);
  }

  @Post(':credentialId/revoke')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  revoke(
    @Param('credentialId', ParseIntPipe) credentialId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehicleAccessCredentialsService.revoke(credentialId, currentUser);
  }
}