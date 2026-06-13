import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({ example: 'Basement 1' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: -1 })
  @IsOptional()
  @IsInt()
  level?: number;
}
