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
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotsService } from './parking-lots.service';

@ApiTags('Parking Lots')
@ApiBearerAuth()
@Controller('parking-lots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingLotsController {
  constructor(private readonly parkingLotsService: ParkingLotsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Active parking lots' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  findAll() {
    return this.parkingLotsService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ description: 'Parking lot created' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  create(@Body() createParkingLotDto: CreateParkingLotDto) {
    return this.parkingLotsService.create(createParkingLotDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SECURITY)
  @ApiOkResponse({ description: 'Parking lot details' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN or SECURITY role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parkingLotsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'Parking lot updated' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateParkingLotDto: UpdateParkingLotDto,
  ) {
    return this.parkingLotsService.update(id, updateParkingLotDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'Parking lot marked inactive' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT' })
  @ApiForbiddenResponse({ description: 'ADMIN role is required' })
  @ApiNotFoundResponse({ description: 'Parking lot not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parkingLotsService.remove(id);
  }
}
