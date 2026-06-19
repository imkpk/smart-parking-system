import { BadRequestException } from '@nestjs/common';
import { CONVERSATION_MESSAGE_MAX_LENGTH } from './conversation.types';

export function normalizeConversationMessage(body: string) {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new BadRequestException('Message is required');
  }

  if (trimmed.length > CONVERSATION_MESSAGE_MAX_LENGTH) {
    throw new BadRequestException(
      `Message must be at most ${CONVERSATION_MESSAGE_MAX_LENGTH} characters`,
    );
  }

  return trimmed;
}

export function buildMessagePreview(body: string, maxLength = 120) {
  if (body.length <= maxLength) {
    return body;
  }

  return `${body.slice(0, maxLength - 1)}…`;
}