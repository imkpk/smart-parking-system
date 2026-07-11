import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { CreateIotDeviceDto } from '../dto/create-iot-device.dto';
import { UpdateIotDeviceDto } from '../dto/update-iot-device.dto';
import { IotDevicesService } from '../services/iot-devices.service';

@Controller('iot/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IotDevicesController {
  constructor(private readonly iotDevicesService: IotDevicesService) {}

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findAll(
    @CurrentUser() currentUser: SafeUser,
    @Query('gateId', new ParseIntPipe({ optional: true })) gateId?: number,
  ) {
    return this.iotDevicesService.findAll(currentUser, gateId);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  create(@CurrentUser() currentUser: SafeUser, @Body() dto: CreateIotDeviceDto) {
    return this.iotDevicesService.create(currentUser, dto);
  }

  @Get(':deviceId')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findOne(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.iotDevicesService.findOne(deviceId, currentUser);
  }

  @Patch(':deviceId')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  update(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: UpdateIotDeviceDto,
  ) {
    return this.iotDevicesService.update(deviceId, currentUser, dto);
  }

  @Post(':deviceId/rotate-credential')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  rotateCredential(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.iotDevicesService.rotateCredential(deviceId, currentUser);
  }

  @Post(':deviceId/disable')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  disable(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.iotDevicesService.disable(deviceId, currentUser);
  }
}