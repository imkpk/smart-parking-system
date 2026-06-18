import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post('onboard')
  @Roles(Role.SUPER_ADMIN)
  onboard(
    @CurrentUser() currentUser: SafeUser,
    @Body() onboardOrganizationDto: OnboardOrganizationDto,
  ) {
    return this.organizationsService.onboard(currentUser, onboardOrganizationDto);
  }
}
