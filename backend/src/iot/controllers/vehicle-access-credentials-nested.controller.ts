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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateRfidAccessCredentialDto } from '../dto/create-rfid-access-credential.dto';
import { VehicleAccessCredentialsService } from '../services/vehicle-access-credentials.service';

@Controller('vehicles/:vehicleId/access-credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleAccessCredentialsNestedController {
  constructor(
    private readonly vehicleAccessCredentialsService: VehicleAccessCredentialsService,
  ) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findByVehicle(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehicleAccessCredentialsService.findByVehicle(vehicleId, currentUser);
  }

  @Post('rfid')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  createRfid(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: CreateRfidAccessCredentialDto,
  ) {
    return this.vehicleAccessCredentialsService.createRfid(vehicleId, currentUser, dto);
  }

  @Post('qr')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  createQr(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehicleAccessCredentialsService.createQr(vehicleId, currentUser);
  }

  @Post(':credentialId/revoke')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  revoke(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('credentialId', ParseIntPipe) credentialId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehicleAccessCredentialsService.revokeForVehicle(
      vehicleId,
      credentialId,
      currentUser,
    );
  }
}