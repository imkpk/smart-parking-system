import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin-summary')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  getAdminSummary(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getAdminSummary(currentUser);
  }

  @Get('parking-lot/:id/summary')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  getParkingLotSummary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.dashboardService.getParkingLotSummary(id, currentUser);
  }

  @Get('recent-events')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  getRecentEvents(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getRecentEvents(currentUser);
  }

  @Get('today-bookings')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  getTodayBookings(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getTodayBookings(currentUser);
  }

  @Get('slot-status-summary')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  getSlotStatusSummary(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getSlotStatusSummary(currentUser);
  }

  @Get('onboarding-status')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  getOnboardingStatus(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getOnboardingStatus(currentUser);
  }

  @Get('operator-metrics')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY, Role.USER)
  getOperatorMetrics(@CurrentUser() currentUser: SafeUser) {
    return this.dashboardService.getOperatorMetrics(currentUser);
  }

  @Get('recent-activity')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY, Role.USER)
  getRecentActivity(
    @CurrentUser() currentUser: SafeUser,
    @Query() query: RecentActivityQueryDto,
  ) {
    return this.dashboardService.getRecentActivity(currentUser, query);
  }
}