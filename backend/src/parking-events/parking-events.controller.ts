import {
  Body,
  Controller,
  Get,
  Headers,
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
import { SafeUser } from '../users/types/safe-user.type';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { ParkingEventsService } from './parking-events.service';

@Controller('parking-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingEventsController {
  constructor(private readonly parkingEventsService: ParkingEventsService) {}

  @Post('check-in')
  @Roles(Role.SECURITY)
  checkIn(@Body() checkInDto: CheckInDto) {
    return this.parkingEventsService.checkIn(checkInDto);
  }

  @Post('check-out')
  @Roles(Role.SECURITY)
  checkOut(
    @Body() checkOutDto: CheckOutDto,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.parkingEventsService.checkOut(checkOutDto, authorizationHeader);
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.SECURITY)
  findActive() {
    return this.parkingEventsService.findActive();
  }

  @Get('history')
  @Roles(Role.USER)
  findHistory(@CurrentUser() currentUser: SafeUser) {
    return this.parkingEventsService.findHistory(currentUser.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.parkingEventsService.findAll();
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.parkingEventsService.findOne(id, currentUser);
  }
}
