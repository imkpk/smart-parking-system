import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { SecurityGateService } from './security-gate.service';

@Controller('security/gate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityGateController {
  constructor(private readonly securityGateService: SecurityGateService) {}

  @Get('search')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.SECURITY)
  async search(
    @Query('q') query: string,
    @CurrentUser() currentUser: SafeUser,
  ) {
    const result = await this.securityGateService.search(query ?? '', currentUser);

    if (!result) {
      throw new NotFoundException('No matching booking or active session found');
    }

    return result;
  }
}