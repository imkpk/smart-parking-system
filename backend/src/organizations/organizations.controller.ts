import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';
import { UpdateOrganizationBrandingDto } from './dto/update-organization-branding.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('public-branding/:slug')
  getPublicBranding(@Param('slug') slug: string) {
    return this.organizationsService.getPublicBrandingBySlug(slug);
  }

  @Get('current/branding')
  @UseGuards(JwtAuthGuard)
  getCurrentBranding(@CurrentUser() currentUser: SafeUser) {
    return this.organizationsService.getCurrentBranding(currentUser);
  }

  @Patch('current/branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  updateCurrentBranding(
    @CurrentUser() currentUser: SafeUser,
    @Body() updateOrganizationBrandingDto: UpdateOrganizationBrandingDto,
  ) {
    return this.organizationsService.updateCurrentBranding(
      currentUser,
      updateOrganizationBrandingDto,
    );
  }

  @Post('onboard')
  @UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Roles(Role.SUPER_ADMIN)
  onboard(
    @CurrentUser() currentUser: SafeUser,
    @Body() onboardOrganizationDto: OnboardOrganizationDto,
  ) {
    return this.organizationsService.onboard(currentUser, onboardOrganizationDto);
  }
}