import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin-summary')
  @Roles(Role.ADMIN)
  getAdminSummary(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getAdminSummary(currentUser);
  }

  @Get('parking-lot/:id/summary')
  @Roles(Role.ADMIN)
  getParkingLotSummary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.dashboardService.getParkingLotSummary(id, currentUser);
  }

  @Get('recent-events')
  @Roles(Role.ADMIN, Role.SECURITY)
  getRecentEvents(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getRecentEvents(currentUser);
  }

  @Get('today-bookings')
  @Roles(Role.ADMIN)
  getTodayBookings(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getTodayBookings(currentUser);
  }

  @Get('slot-status-summary')
  @Roles(Role.ADMIN, Role.SECURITY)
  getSlotStatusSummary(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getSlotStatusSummary(currentUser);
  }
}