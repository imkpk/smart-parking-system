import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin-summary')
  @Roles(Role.ADMIN)
  getAdminSummary() {
    return this.dashboardService.getAdminSummary();
  }

  @Get('parking-lot/:id/summary')
  @Roles(Role.ADMIN)
  getParkingLotSummary(@Param('id', ParseIntPipe) id: number) {
    return this.dashboardService.getParkingLotSummary(id);
  }

  @Get('recent-events')
  @Roles(Role.ADMIN, Role.SECURITY)
  getRecentEvents() {
    return this.dashboardService.getRecentEvents();
  }

  @Get('today-bookings')
  @Roles(Role.ADMIN)
  getTodayBookings() {
    return this.dashboardService.getTodayBookings();
  }

  @Get('slot-status-summary')
  @Roles(Role.ADMIN, Role.SECURITY)
  getSlotStatusSummary() {
    return this.dashboardService.getSlotStatusSummary();
  }
}
