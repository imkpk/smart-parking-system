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
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotsService } from './parking-lots.service';

@Controller('parking-lots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingLotsController {
  constructor(private readonly parkingLotsService: ParkingLotsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SECURITY, Role.USER)
  findAll(@CurrentUser() currentUser: SafeUser) {
    return this.parkingLotsService.findAll(currentUser);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() currentUser: SafeUser,
    @Body() createParkingLotDto: CreateParkingLotDto,
  ) {
    return this.parkingLotsService.create(currentUser, createParkingLotDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SECURITY, Role.USER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.parkingLotsService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() updateParkingLotDto: UpdateParkingLotDto,
  ) {
    return this.parkingLotsService.update(id, currentUser, updateParkingLotDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.parkingLotsService.remove(id, currentUser);
  }
}