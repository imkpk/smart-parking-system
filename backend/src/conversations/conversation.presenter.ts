import { ConversationStatus, ConversationType, Prisma, Role } from '@prisma/client';
import { formatGateBookingNo } from '../security/security-gate-search.util';
import { SafeUser } from '../users/types/safe-user.type';
import { buildMessagePreview } from './conversation.util';
import {
  ConversationListItem,
  ConversationMessageItem,
} from './conversation.types';

export const conversationListInclude = {
  createdByUser: {
    select: {
      name: true,
      email: true,
    },
  },
  assignedToUser: {
    select: {
      name: true,
      email: true,
    },
  },
  parkingLot: {
    select: {
      id: true,
      name: true,
    },
  },
  booking: {
    select: {
      id: true,
      bookingCode: true,
    },
  },
  messages: {
    orderBy: {
      createdAt: 'desc' as const,
    },
    take: 1,
    select: {
      body: true,
    },
  },
} satisfies Prisma.ConversationInclude;

export type ConversationListRecord = Prisma.ConversationGetPayload<{
  include: typeof conversationListInclude;
}>;

export const conversationMessageInclude = {
  sender: {
    select: {
      name: true,
      role: true,
    },
  },
} satisfies Prisma.ConversationMessageInclude;

export type ConversationMessageRecord = Prisma.ConversationMessageGetPayload<{
  include: typeof conversationMessageInclude;
}>;

export function presentConversationListItem(
  conversation: ConversationListRecord,
): ConversationListItem {
  const latestMessage = conversation.messages[0];

  return {
    id: conversation.id,
    type: conversation.type,
    status: conversation.status,
    subject: conversation.subject,
    createdBy: {
      name: conversation.createdByUser.name,
      email: conversation.createdByUser.email ?? '',
    },
    assignedTo: conversation.assignedToUser
      ? {
          name: conversation.assignedToUser.name,
          email: conversation.assignedToUser.email ?? '',
        }
      : undefined,
    parkingLot: conversation.parkingLot
      ? {
          id: conversation.parkingLot.id,
          name: conversation.parkingLot.name,
        }
      : undefined,
    booking: conversation.booking
      ? {
          bookingNo: formatGateBookingNo(conversation.booking.id),
          bookingCode: conversation.booking.bookingCode,
        }
      : undefined,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: latestMessage ? buildMessagePreview(latestMessage.body) : null,
    unreadCount: 0,
  };
}

export function presentConversationList(
  conversations: ConversationListRecord[],
): ConversationListItem[] {
  return conversations.map(presentConversationListItem);
}

export function presentConversationMessage(
  message: ConversationMessageRecord,
  currentUser: SafeUser,
): ConversationMessageItem {
  return {
    id: message.id,
    sender: {
      name: message.sender.name,
      role: message.sender.role,
    },
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    isMine: message.senderId === currentUser.id,
  };
}