import {
  ConversationListItem,
  ConversationMessage,
  ListConversationsQuery,
  SendConversationMessageRequest,
  StartCustomerCareConversationRequest,
  StartSecurityConversationRequest,
} from '../types/conversation';
import { apiClient } from './client';

export async function startSecurityConversation(payload: StartSecurityConversationRequest) {
  const response = await apiClient.post<ConversationListItem>(
    '/conversations/security',
    payload,
  );
  return response.data;
}

export async function startCustomerCareConversation(
  payload: StartCustomerCareConversationRequest,
) {
  const response = await apiClient.post<ConversationListItem>(
    '/conversations/customer-care',
    payload,
  );
  return response.data;
}

export async function listConversations(query?: ListConversationsQuery) {
  const response = await apiClient.get<ConversationListItem[]>('/conversations', {
    params: query,
  });
  return response.data;
}

export async function getConversationMessages(conversationId: number) {
  const response = await apiClient.get<ConversationMessage[]>(
    `/conversations/${conversationId}/messages`,
  );
  return response.data;
}

export async function sendConversationMessage(
  conversationId: number,
  payload: SendConversationMessageRequest,
) {
  const response = await apiClient.post<ConversationMessage>(
    `/conversations/${conversationId}/messages`,
    payload,
  );
  return response.data;
}

export async function resolveConversation(conversationId: number) {
  const response = await apiClient.patch<ConversationListItem>(
    `/conversations/${conversationId}/resolve`,
  );
  return response.data;
}