import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ParkingEventsService } from './parking-events.service';

@ApiTags('Parking Events')
@ApiBearerAuth()
@Controller('parking-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingEventsController {
  constructor(private readonly parkingEventsService: ParkingEventsService) {}

  @Post('check-in')
  @Roles(Role.SECURITY)
  @ApiCreatedResponse({ description: 'Vehicle checked in and slot occupied' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'SECURITY role is required' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  checkIn(@Body() checkInDto: CheckInDto) {
    return this.parkingEventsService.checkIn(checkInDto);
  }

  @Post('check-out')
  @Roles(Role.SECURITY)
  @ApiOkResponse({ description: 'Vehicle checked out, fee calculated, and slot released' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'SECURITY role is required' })
  @ApiNotFoundResponse({ description: 'Parking event not found' })
  checkOut(@Body() checkOutDto: CheckOutDto) {
    return this.parkingEventsService.checkOut(checkOutDto);
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Active parking events' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  findActive() {
    return this.parkingEventsService.findActive();
  }

  @Get('history')
  @Roles(Role.USER)
  @ApiOkResponse({ description: 'Current user parking history' })
  findHistory(@CurrentUser() currentUser: SafeUser) {
    return this.parkingEventsService.findHistory(currentUser.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'All parking events' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  findAll() {
    return this.parkingEventsService.findAll();
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Parking event details' })
  @ApiNotFoundResponse({ description: 'Parking event not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.parkingEventsService.findOne(id, currentUser);
  }
}
