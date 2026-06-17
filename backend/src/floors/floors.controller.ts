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
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { FloorsService } from './floors.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get('parking-lots/:parkingLotId/floors')
  @Roles(Role.ADMIN, Role.SECURITY)
  findByParkingLot(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.floorsService.findByParkingLot(parkingLotId, currentUser);
  }

  @Post('parking-lots/:parkingLotId/floors')
  @Roles(Role.ADMIN)
  create(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() createFloorDto: CreateFloorDto,
  ) {
    return this.floorsService.create(parkingLotId, currentUser, createFloorDto);
  }

  @Patch('floors/:id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(id, currentUser, updateFloorDto);
  }

  @Delete('floors/:id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: SafeUser,
  ) {
    return this.floorsService.remove(id, currentUser);
  }
}