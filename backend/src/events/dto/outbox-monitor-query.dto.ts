import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { OutboxEventStatus, OutboxEventType } from '@prisma/client';

export class OutboxMonitorQueryDto {
  @IsOptional()
  @IsEnum(OutboxEventStatus)
  status?: OutboxEventStatus;

  @IsOptional()
  @IsEnum(OutboxEventType)
  eventType?: OutboxEventType;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  organizationId?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  limit?: number;
}
