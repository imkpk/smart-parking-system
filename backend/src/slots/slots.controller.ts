import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { SlotMapQueryDto } from './dto/slot-map-query.dto';
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { DeleteSlotsDto } from './dto/delete-slots.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
import { SlotsService } from './slots.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get('parking-lots/:parkingLotId/slots')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  findByParkingLot(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.slotsService.findByParkingLot(parkingLotId, currentUser);
  }

  @Get('parking-lots/:parkingLotId/slot-map')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY, Role.USER)
  getSlotMap(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @CurrentUser() currentUser: SafeUser,
    @Query() query: SlotMapQueryDto,
  ) {
    return this.slotsService.getSlotMap(parkingLotId, currentUser, query);
  }

  @Get('parking-lots/:parkingLotId/available-slots')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  findAvailableByParkingLot(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @CurrentUser() currentUser: SafeUser,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    return this.slotsService.findAvailableByParkingLot(
      parkingLotId,
      currentUser,
      query.vehicleType,
    );
  }

  @Post('floors/:floorId/slots')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  create(
    @Param('floorId', ParseIntPipe) floorId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() createSlotDto: CreateSlotDto,
  ) {
    return this.slotsService.create(floorId, currentUser, createSlotDto);
  }

  @Post('floors/:floorId/slots/bulk')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  createBulk(
    @Param('floorId', ParseIntPipe) floorId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() createBulkSlotsDto: CreateBulkSlotsDto,
  ) {
    return this.slotsService.createBulk(floorId, currentUser, createBulkSlotsDto);
  }

  @Patch('slots/:id/status')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() updateSlotStatusDto: UpdateSlotStatusDto,
  ) {
    return this.slotsService.updateStatus(id, currentUser, updateSlotStatusDto);
  }

  @Delete('slots/:id')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.slotsService.remove(id, currentUser);
  }

  @Delete('slots')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  removeBulk(
    @CurrentUser() currentUser: SafeUser,
    @Body() deleteSlotsDto: DeleteSlotsDto,
  ) {
    return this.slotsService.removeBulk(deleteSlotsDto.ids, currentUser);
  }
}