import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { FormEvent, useMemo, useState } from 'react';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { QueryErrorAlert } from '../../components/common/QueryErrorAlert';
import { StatusChip } from '../../components/common/StatusChip';
import { ChatMessageBubble } from '../../components/support/ChatMessageBubble';
import {
  formatConversationType,
  getConversationContextLabel,
} from '../../components/support/conversationDisplay';
import {
  useConversationMessages,
  useConversations,
  useResolveConversation,
  useSendConversationMessage,
} from '../../hooks/useConversations';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatRelativeTime } from '../../lib/formatters';
import {
  CONVERSATION_MESSAGE_MAX_LENGTH,
  ConversationStatus,
  ConversationType,
  ListConversationsQuery,
} from '../../types/conversation';

type StatusFilter = 'ALL' | ConversationStatus;
type TypeFilter = 'ALL' | ConversationType;

interface StaffSupportInboxProps {
  description: string;
  lockedType?: ConversationType;
  showTypeFilter?: boolean;
  title: string;
}

function StaffSupportInbox({
  description,
  lockedType,
  showTypeFilter = false,
  title,
}: StaffSupportInboxProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    lockedType ?? (showTypeFilter ? 'CUSTOMER_CARE' : 'ALL'),
  );
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState('');

  const listQueryParams = useMemo<ListConversationsQuery>(() => {
    const query: ListConversationsQuery = {};

    if (statusFilter !== 'ALL') {
      query.status = statusFilter;
    }

    const effectiveType = lockedType ?? (typeFilter === 'ALL' ? undefined : typeFilter);
    if (effectiveType) {
      query.type = effectiveType;
    }

    return query;
  }, [lockedType, statusFilter, typeFilter]);

  const listQuery = useConversations(listQueryParams);

  const selectedConversation = useMemo(
    () => listQuery.data?.find((item) => item.id === selectedConversationId) ?? null,
    [listQuery.data, selectedConversationId],
  );

  const messagesQuery = useConversationMessages(selectedConversationId, {
    poll: Boolean(selectedConversationId),
  });

  const sendMessageMutation = useSendConversationMessage();
  const resolveMutation = useResolveConversation();

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedConversationId || !messageDraft.trim()) {
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        payload: { body: messageDraft },
      });
      setMessageDraft('');
    } catch (error) {
      showError(getApiErrorMessage(error, 'Could not send message'));
    }
  };

  const handleResolve = async () => {
    if (!selectedConversationId) {
      return;
    }

    try {
      await resolveMutation.mutateAsync(selectedConversationId);
      showSuccess('Conversation resolved');
    } catch (error) {
      showError(getApiErrorMessage(error, 'Could not resolve conversation'));
    }
  };

  const showThreadPanel = !isMobile || selectedConversationId !== null;
  const showListPanel = !isMobile || selectedConversationId === null;

  return (
    <Stack spacing={3}>
      <PageHeader description={description} title={title} />

      <QueryErrorAlert error={listQuery.error} fallbackMessage="Could not load conversations." />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 480 }}>
        {showListPanel ? (
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              flex: { md: '0 0 340px' },
              overflow: 'hidden',
              width: { xs: '100%', md: 340 },
            }}
          >
            <Stack spacing={1.5} sx={{ p: 2 }}>
              <Typography variant="subtitle1">Inbox</Typography>
              {showTypeFilter ? (
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  onChange={(_event, value: TypeFilter | null) => {
                    if (value) {
                      setTypeFilter(value);
                    }
                  }}
                  size="small"
                  value={typeFilter}
                >
                  <ToggleButton value="ALL">All</ToggleButton>
                  <ToggleButton value="CUSTOMER_CARE">Customer Care</ToggleButton>
                  <ToggleButton value="SECURITY">Security</ToggleButton>
                </ToggleButtonGroup>
              ) : null}
              <ToggleButtonGroup
                exclusive
                fullWidth
                onChange={(_event, value: StatusFilter | null) => {
                  if (value) {
                    setStatusFilter(value);
                  }
                }}
                size="small"
                value={statusFilter}
              >
                <ToggleButton value="OPEN">Open</ToggleButton>
                <ToggleButton value="RESOLVED">Resolved</ToggleButton>
                <ToggleButton value="ALL">All</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Divider />
            {listQuery.isLoading ? (
              <Stack alignItems="center" py={6}>
                <CircularProgress size={28} />
              </Stack>
            ) : null}
            {!listQuery.isLoading && (listQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                description="Conversations from users will appear here."
                illustration="empty"
                title="No conversations"
              />
            ) : null}
            {listQuery.data && listQuery.data.length > 0 ? (
              <List disablePadding>
                {listQuery.data.map((conversation) => {
                  const contextLabel = getConversationContextLabel(conversation);
                  const isSelected = conversation.id === selectedConversationId;

                  return (
                    <ListItemButton
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      selected={isSelected}
                      sx={{ alignItems: 'flex-start', py: 1.5 }}
                    >
                      <ListItemText
                        primary={
                          <Typography sx={{ fontWeight: 600 }} variant="body2">
                            {conversation.createdBy.name}
                          </Typography>
                        }
                        secondary={
                          <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                              <Chip
                                label={formatConversationType(conversation.type)}
                                size="small"
                                variant="outlined"
                              />
                              <StatusChip status={conversation.status} />
                            </Stack>
                            {contextLabel ? (
                              <Typography color="text.secondary" variant="caption">
                                {contextLabel}
                              </Typography>
                            ) : null}
                            <Typography color="text.secondary" variant="body2">
                              {conversation.lastMessagePreview ?? 'No messages yet'}
                            </Typography>
                            <Typography color="text.secondary" variant="caption">
                              {formatRelativeTime(conversation.lastMessageAt)}
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            ) : null}
          </Paper>
        ) : null}

        {showThreadPanel ? (
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              minHeight: { xs: 420, md: 520 },
              overflow: 'hidden',
            }}
          >
            {!selectedConversation ? (
              <EmptyState
                description="Select a conversation from the inbox to reply."
                illustration="secureLogin"
                title="Select a conversation"
              />
            ) : (
              <>
                <Stack spacing={1} sx={{ borderBottom: '1px solid', borderColor: 'divider', p: 2 }}>
                  <Stack alignItems="center" direction="row" spacing={1}>
                    {isMobile ? (
                      <Button
                        onClick={() => setSelectedConversationId(null)}
                        size="small"
                        startIcon={<ArrowBack />}
                      >
                        Back
                      </Button>
                    ) : null}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6">{selectedConversation.createdBy.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {selectedConversation.createdBy.email}
                      </Typography>
                    </Box>
                    {selectedConversation.status === 'OPEN' ? (
                      <Button
                        disabled={resolveMutation.isPending}
                        onClick={handleResolve}
                        size="small"
                        variant="outlined"
                      >
                        Resolve
                      </Button>
                    ) : (
                      <StatusChip status={selectedConversation.status} />
                    )}
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    <Chip
                      label={formatConversationType(selectedConversation.type)}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  {selectedConversation.subject ? (
                    <Typography variant="body2">{selectedConversation.subject}</Typography>
                  ) : null}
                  {getConversationContextLabel(selectedConversation) ? (
                    <Typography color="text.secondary" variant="body2">
                      {getConversationContextLabel(selectedConversation)}
                    </Typography>
                  ) : null}
                  {selectedConversation.status === 'RESOLVED' ? (
                    <Alert severity="info">This conversation is resolved.</Alert>
                  ) : null}
                </Stack>

                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
                  {messagesQuery.isLoading ? (
                    <Stack alignItems="center" py={6}>
                      <CircularProgress size={28} />
                    </Stack>
                  ) : null}
                  {messagesQuery.error ? (
                    <QueryErrorAlert
                      error={messagesQuery.error}
                      fallbackMessage="Could not load messages."
                    />
                  ) : null}
                  {messagesQuery.data && messagesQuery.data.length > 0 ? (
                    <Stack spacing={1.5}>
                      {messagesQuery.data.map((message) => (
                        <ChatMessageBubble key={message.id} message={message} />
                      ))}
                    </Stack>
                  ) : (
                    <EmptyState
                      description="Reply to start helping the customer."
                      title="No messages yet"
                    />
                  )}
                </Box>

                <Box
                  component="form"
                  onSubmit={handleSendMessage}
                  sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}
                >
                  <Stack spacing={1}>
                    <TextField
                      disabled={
                        selectedConversation.status === 'RESOLVED' || sendMessageMutation.isPending
                      }
                      fullWidth
                      helperText={`${messageDraft.length}/${CONVERSATION_MESSAGE_MAX_LENGTH}`}
                      inputProps={{ maxLength: CONVERSATION_MESSAGE_MAX_LENGTH }}
                      minRows={2}
                      multiline
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Type your reply"
                      value={messageDraft}
                    />
                    <Button
                      disabled={
                        selectedConversation.status === 'RESOLVED' ||
                        !messageDraft.trim() ||
                        sendMessageMutation.isPending
                      }
                      type="submit"
                      variant="contained"
                    >
                      Send reply
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
        ) : null}
      </Stack>

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}

export function SecurityMessagesPage() {
  return (
    <StaffSupportInbox
      description="Reply to user security messages for your organization."
      lockedType="SECURITY"
      title="Security Messages"
    />
  );
}

export function AdminSupportInboxPage() {
  return (
    <StaffSupportInbox
      description="Handle customer-care requests and monitor security conversations."
      showTypeFilter
      title="Support Inbox"
    />
  );
}