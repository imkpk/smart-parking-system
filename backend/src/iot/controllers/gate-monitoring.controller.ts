import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SafeUser } from '../../users/types/safe-user.type';
import { GateMonitoringQueryDto } from '../dto/gate-monitoring-query.dto';
import { GateMonitoringService } from '../services/gate-monitoring.service';

@Controller('gates/:gateId/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GateMonitoringController {
  constructor(private readonly gateMonitoringService: GateMonitoringService) {}

  @Get('health')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  getHealth(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.gateMonitoringService.getGateHealth(gateId, currentUser);
  }

  @Get('attempts')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  listAttempts(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
    @Query() query: GateMonitoringQueryDto,
  ) {
    return this.gateMonitoringService.listAttempts(gateId, currentUser, query);
  }

  @Get('commands')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  listCommands(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
    @Query() query: GateMonitoringQueryDto,
  ) {
    return this.gateMonitoringService.listCommands(gateId, currentUser, query);
  }
}

@Controller('gates/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GateActivityMonitoringController {
  constructor(private readonly gateMonitoringService: GateMonitoringService) {}

  @Get('activity')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  getRecentActivity(@CurrentUser() currentUser: SafeUser) {
    return this.gateMonitoringService.getRecentActivity(currentUser);
  }
}