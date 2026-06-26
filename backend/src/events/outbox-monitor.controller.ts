import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OutboxMonitorQueryDto } from './dto/outbox-monitor-query.dto';
import { OutboxMonitorService } from './outbox-monitor.service';

@Controller('events/outbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class OutboxMonitorController {
  constructor(private readonly outboxMonitorService: OutboxMonitorService) {}

  @Get()
  list(@Query() query: OutboxMonitorQueryDto) {
    return this.outboxMonitorService.list(query);
  }

  @Get('summary')
  getSummary() {
    return this.outboxMonitorService.getSummary();
  }
}
