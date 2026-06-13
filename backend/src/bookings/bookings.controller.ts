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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.USER)
  @ApiCreatedResponse({ description: 'Booking created and slot reserved' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'USER role is required' })
  create(
    @CurrentUser() currentUser: SafeUser,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(currentUser, createBookingDto);
  }

  @Get('my')
  @Roles(Role.USER)
  @ApiOkResponse({ description: 'Current user bookings' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  findMine(@CurrentUser() currentUser: SafeUser) {
    return this.bookingsService.findMine(currentUser.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'All bookings' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Booking details' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.bookingsService.findOne(id, currentUser);
  }

  @Post(':id/cancel')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOkResponse({ description: 'Booking cancelled and slot released' })
  @ApiForbiddenResponse({ description: 'Only owner or ADMIN can cancel booking' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.bookingsService.cancel(id, currentUser);
  }
}
