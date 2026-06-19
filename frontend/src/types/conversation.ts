import { Role } from './auth';

export type ConversationType = 'SECURITY' | 'CUSTOMER_CARE';
export type ConversationStatus = 'OPEN' | 'RESOLVED';

export const CONVERSATION_MESSAGE_MAX_LENGTH = 2000;
export const CONVERSATION_MESSAGES_POLL_MS = 5000;

export interface ConversationUserLabel {
  name: string;
  email: string;
}

export interface ConversationParkingLotLabel {
  id: number;
  name: string;
}

export interface ConversationBookingLabel {
  bookingNo: string;
  bookingCode: string;
}

export interface ConversationListItem {
  id: number;
  type: ConversationType;
  status: ConversationStatus;
  subject: string | null;
  createdBy: ConversationUserLabel;
  assignedTo?: ConversationUserLabel;
  parkingLot?: ConversationParkingLotLabel;
  booking?: ConversationBookingLabel;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount?: number;
}

export interface ConversationMessage {
  id: number;
  sender: {
    name: string;
    role: Role;
  };
  body: string;
  createdAt: string;
  isMine: boolean;
}

export interface StartSecurityConversationRequest {
  parkingLotId?: number;
  bookingId?: number;
  message: string;
}

export interface StartCustomerCareConversationRequest {
  subject?: string;
  bookingId?: number;
  message: string;
}

export interface SendConversationMessageRequest {
  body: string;
}

export interface ListConversationsQuery {
  type?: ConversationType;
  status?: ConversationStatus;
}