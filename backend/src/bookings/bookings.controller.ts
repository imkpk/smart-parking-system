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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.USER)
  create(
    @CurrentUser() currentUser: SafeUser,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(currentUser, createBookingDto);
  }

  @Get('my')
  @Roles(Role.USER)
  findMine(@CurrentUser() currentUser: SafeUser) {
    return this.bookingsService.findMine(currentUser);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SECURITY)
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.bookingsService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.bookingsService.findOne(id, currentUser);
  }

  @Post(':id/cancel')
  @Roles(Role.USER, Role.ADMIN)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.bookingsService.cancel(id, currentUser);
  }
}
