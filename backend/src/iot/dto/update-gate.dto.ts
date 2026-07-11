import { PartialType } from '@nestjs/mapped-types';
import { CreateGateDto } from './create-gate.dto';

export class UpdateGateDto extends PartialType(CreateGateDto) {}