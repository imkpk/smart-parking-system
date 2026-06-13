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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { FloorsService } from './floors.service';

@ApiTags('Floors')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get('parking-lots/:parkingLotId/floors')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Floors for a parking lot' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  findByParkingLot(@Param('parkingLotId', ParseIntPipe) parkingLotId: number) {
    return this.floorsService.findByParkingLot(parkingLotId);
  }

  @Post('parking-lots/:parkingLotId/floors')
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ description: 'Floor created' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  create(
    @Param('parkingLotId', ParseIntPipe) parkingLotId: number,
    @Body() createFloorDto: CreateFloorDto,
  ) {
    return this.floorsService.create(parkingLotId, createFloorDto);
  }

  @Patch('floors/:id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'Floor updated' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Floor not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(id, updateFloorDto);
  }

  @Delete('floors/:id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'Floor deleted' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Floor not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.floorsService.remove(id);
  }
}
