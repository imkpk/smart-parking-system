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
  @Roles(Role.ADMIN, Role.SECURITY)
  checkIn(
    @Body() checkInDto: CheckInDto,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.parkingEventsService.checkIn(checkInDto, currentUser);
  }

  @Post('check-out')
  @Roles(Role.ADMIN, Role.SECURITY)
  checkOut(
    @Body() checkOutDto: CheckOutDto,
    @CurrentUser() currentUser: SafeUser,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.parkingEventsService.checkOut(
      checkOutDto,
      currentUser,
      authorizationHeader,
    );
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.SECURITY)
  findActive(@CurrentUser() currentUser: SafeUser) {
    return this.parkingEventsService.findActive(currentUser);
  }

  @Get('history')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  findHistory(@CurrentUser() currentUser: SafeUser) {
    return this.parkingEventsService.findHistory(currentUser);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.parkingEventsService.findAll(currentUser);
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