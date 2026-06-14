import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class CheckOutDto {
  @Type(() => Number)
  @IsInt()
  parkingEventId: number;
}
