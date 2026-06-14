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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { FloorsService } from './floors.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get('parking-lots/:parkingLotId/floors')
  @Roles(Role.ADMIN, Role.SECURITY)
  findByParkingLot(@Param('parkingLotId', ParseIntPipe) parkingLotId: number) {
    return this.floorsService.findByParkingLot(parkingLotId);
  }

  @Post('parking-lots/:parkingLotId/floors')
  @Roles(Role.ADMIN)
  create(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @Body() createFloorDto: CreateFloorDto,
  ) {
    return this.floorsService.create(parkingLotId, createFloorDto);
  }

  @Patch('floors/:id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(id, updateFloorDto);
  }

  @Delete('floors/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.floorsService.remove(id);
  }
}
