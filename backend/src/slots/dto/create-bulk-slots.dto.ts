import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateSlotDto } from './create-slot.dto';

export class CreateBulkSlotsDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSlotDto)
  slots: CreateSlotDto[];
}
