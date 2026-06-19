import { ConversationStatus, ConversationType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListConversationsQueryDto {
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}