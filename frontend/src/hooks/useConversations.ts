import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConversationMessages,
  listConversations,
  resolveConversation,
  sendConversationMessage,
  startCustomerCareConversation,
  startSecurityConversation,
} from '../api/conversationsApi';
import {
  CONVERSATION_MESSAGES_POLL_MS,
  ListConversationsQuery,
  SendConversationMessageRequest,
  StartCustomerCareConversationRequest,
  StartSecurityConversationRequest,
} from '../types/conversation';

export const conversationQueryKeys = {
  all: ['conversations'] as const,
  list: (query?: ListConversationsQuery) =>
    [...conversationQueryKeys.all, 'list', query ?? {}] as const,
  messages: (conversationId: number) =>
    [...conversationQueryKeys.all, conversationId, 'messages'] as const,
};

export function useConversations(query?: ListConversationsQuery, enabled = true) {
  return useQuery({
    queryKey: conversationQueryKeys.list(query),
    queryFn: () => listConversations(query),
    enabled,
  });
}

export function useConversationMessages(
  conversationId: number | null,
  options?: { enabled?: boolean; poll?: boolean },
) {
  const enabled = Boolean(conversationId) && (options?.enabled ?? true);

  return useQuery({
    queryKey: conversationQueryKeys.messages(conversationId ?? 0),
    queryFn: () => getConversationMessages(conversationId!),
    enabled,
    refetchInterval: options?.poll ? CONVERSATION_MESSAGES_POLL_MS : false,
  });
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      payload,
    }: {
      conversationId: number;
      payload: SendConversationMessageRequest;
    }) => sendConversationMessage(conversationId, payload),
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({ queryKey: conversationQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.messages(variables.conversationId),
      });
    },
  });
}

export function useStartSecurityConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartSecurityConversationRequest) =>
      startSecurityConversation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationQueryKeys.all });
    },
  });
}

export function useStartCustomerCareConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartCustomerCareConversationRequest) =>
      startCustomerCareConversation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationQueryKeys.all });
    },
  });
}

export function useResolveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: number) => resolveConversation(conversationId),
    onSuccess: (_conversation, conversationId) => {
      queryClient.invalidateQueries({ queryKey: conversationQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: conversationQueryKeys.messages(conversationId),
      });
    },
  });
}