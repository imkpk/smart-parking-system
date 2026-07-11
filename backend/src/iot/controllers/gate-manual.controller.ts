import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SafeUser } from '../../users/types/safe-user.type';
import { ManualGateOpenDto } from '../dto/manual-gate-open.dto';
import { GateCommandsService } from '../services/gate-commands.service';

@Controller('gates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GateManualController {
  constructor(private readonly gateCommandsService: GateCommandsService) {}

  @Post(':gateId/open')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  openGate(
    @Param('gateId', ParseIntPipe) gateId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: ManualGateOpenDto,
  ) {
    const organizationId = currentUser.organizationId;

    if (organizationId == null) {
      throw new ForbiddenException('Organization context is required');
    }

    return this.gateCommandsService.manualOpenGate({
      organizationId,
      gateId,
      actorUserId: currentUser.id,
      reasonDetail: dto.reasonDetail,
    });
  }
}