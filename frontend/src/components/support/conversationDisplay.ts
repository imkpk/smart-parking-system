import { ConversationListItem, ConversationType } from '../../types/conversation';

export function formatConversationType(type: ConversationType) {
  return type === 'SECURITY' ? 'Security' : 'Customer Care';
}

export function getConversationContextLabel(conversation: ConversationListItem) {
  if (conversation.booking) {
    return `${conversation.booking.bookingNo} · ${conversation.booking.bookingCode}`;
  }

  if (conversation.parkingLot) {
    return conversation.parkingLot.name;
  }

  return null;
}