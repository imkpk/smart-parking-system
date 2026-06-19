import { IsString } from 'class-validator';

export class SendConversationMessageDto {
  @IsString()
  body: string;
}