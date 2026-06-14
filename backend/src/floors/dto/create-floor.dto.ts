import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFloorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  level?: number;
}
