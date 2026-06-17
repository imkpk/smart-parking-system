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
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  register(
    @CurrentUser() currentUser: SafeUser,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(currentUser, createVehicleDto);
  }

  @Get('my')
  @Roles(Role.USER, Role.ADMIN)
  findMine(@CurrentUser() currentUser: SafeUser) {
    return this.vehiclesService.findMine(currentUser);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.vehiclesService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehiclesService.findOneForAdmin(id, currentUser);
  }

  @Patch(':id')
  @Roles(Role.USER, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, currentUser, updateVehicleDto);
  }

  @Delete(':id')
  @Roles(Role.USER, Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.vehiclesService.remove(id, currentUser);
  }
}