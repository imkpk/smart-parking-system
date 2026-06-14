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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
import { SlotsService } from './slots.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get('parking-lots/:parkingLotId/slots')
  @Roles(Role.ADMIN, Role.SECURITY)
  findByParkingLot(@Param('parkingLotId', ParseIntPipe) parkingLotId: number) {
    return this.slotsService.findByParkingLot(parkingLotId);
  }

  @Get('parking-lots/:parkingLotId/available-slots')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  findAvailableByParkingLot(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    return this.slotsService.findAvailableByParkingLot(
      parkingLotId,
      query.vehicleType,
    );
  }

  @Post('floors/:floorId/slots')
  @Roles(Role.ADMIN)
  create(
    @Param('floorId', ParseIntPipe) floorId: number,
    @Body() createSlotDto: CreateSlotDto,
  ) {
    return this.slotsService.create(floorId, createSlotDto);
  }

  @Post('floors/:floorId/slots/bulk')
  @Roles(Role.ADMIN)
  createBulk(
    @Param('floorId', ParseIntPipe) floorId: number,
    @Body() createBulkSlotsDto: CreateBulkSlotsDto,
  ) {
    return this.slotsService.createBulk(floorId, createBulkSlotsDto);
  }

  @Patch('slots/:id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSlotStatusDto: UpdateSlotStatusDto,
  ) {
    return this.slotsService.updateStatus(id, updateSlotStatusDto);
  }
}
