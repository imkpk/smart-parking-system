import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
import { SlotsService } from './slots.service';

@ApiTags('Slots')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get('parking-lots/:parkingLotId/slots')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Slots for a parking lot' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  findByParkingLot(@Param('parkingLotId', ParseIntPipe) parkingLotId: number) {
    return this.slotsService.findByParkingLot(parkingLotId);
  }

  @Get('parking-lots/:parkingLotId/available-slots')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Available slots for a parking lot' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  findAvailableByParkingLot(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
  ) {
    return this.slotsService.findAvailableByParkingLot(parkingLotId);
  }

  @Post('floors/:floorId/slots')
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ description: 'Slot created' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Floor not found' })
  create(
    @Param('floorId', ParseIntPipe) floorId: number,
    @Body() createSlotDto: CreateSlotDto,
  ) {
    return this.slotsService.create(floorId, createSlotDto);
  }

  @Post('floors/:floorId/slots/bulk')
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ description: 'Slots created' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Floor not found' })
  createBulk(
    @Param('floorId', ParseIntPipe) floorId: number,
    @Body() createBulkSlotsDto: CreateBulkSlotsDto,
  ) {
    return this.slotsService.createBulk(floorId, createBulkSlotsDto);
  }

  @Patch('slots/:id/status')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'Slot status updated' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Slot not found' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSlotStatusDto: UpdateSlotStatusDto,
  ) {
    return this.slotsService.updateStatus(id, updateSlotStatusDto);
  }
}
