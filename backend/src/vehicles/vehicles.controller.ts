import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @ApiCreatedResponse({ description: 'Vehicle registered' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  register(
    @CurrentUser() currentUser: SafeUser,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(currentUser.id, createVehicleDto);
  }

  @Get('my')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOkResponse({ description: 'Current user vehicles' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  findMine(@CurrentUser() currentUser: SafeUser) {
    return this.vehiclesService.findMine(currentUser.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'All vehicles' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'Vehicle details' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOneForAdmin(id);
  }

  @Patch(':id')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOkResponse({ description: 'Vehicle updated' })
  @ApiForbiddenResponse({ description: 'Only owner or ADMIN can update vehicle' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, currentUser, updateVehicleDto);
  }

  @Delete(':id')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOkResponse({ description: 'Vehicle deleted' })
  @ApiForbiddenResponse({ description: 'Only owner or ADMIN can delete vehicle' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehiclesService.remove(id, currentUser);
  }
}
