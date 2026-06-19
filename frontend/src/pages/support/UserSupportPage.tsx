import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { getMyBookings } from '../../api/bookingsApi';
import { getParkingLots } from '../../api/parkingLotsApi';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { EmptyState } from '../../components/common/EmptyState';
import { Illustration } from '../../components/common/Illustration';
import { HeaderActionButton, PageHeader } from '../../components/common/PageHeader';
import { QueryErrorAlert } from '../../components/common/QueryErrorAlert';
import { StatusChip } from '../../components/common/StatusChip';
import { ChatMessageList } from '../../components/support/ChatMessageBubble';
import { getChatIllustration } from '../../components/support/chatIllustrations';
import {
  formatConversationType,
  getConversationContextLabel,
} from '../../components/support/conversationDisplay';
import {
  useConversationMessages,
  useConversations,
  useSendConversationMessage,
  useStartCustomerCareConversation,
  useStartSecurityConversation,
} from '../../hooks/useConversations';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage } from '../../lib/apiError';
import { formatBookingNo, formatRelativeTime } from '../../lib/formatters';
import {
  CONVERSATION_MESSAGE_MAX_LENGTH,
  ConversationStatus,
} from '../../types/conversation';

type StatusFilter = 'ALL' | ConversationStatus;
type SecurityLinkType = 'parkingLot' | 'booking';

export function UserSupportPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [customerCareDialogOpen, setCustomerCareDialogOpen] = useState(false);

  const [securityLinkType, setSecurityLinkType] = useState<SecurityLinkType>('parkingLot');
  const [securityParkingLotId, setSecurityParkingLotId] = useState<number | ''>('');
  const [securityBookingId, setSecurityBookingId] = useState<number | ''>('');
  const [securityMessage, setSecurityMessage] = useState('');

  const [careSubject, setCareSubject] = useState('');
  const [careBookingId, setCareBookingId] = useState<number | ''>('');
  const [careMessage, setCareMessage] = useState('');

  const listQuery = useConversations(
    statusFilter === 'ALL' ? undefined : { status: statusFilter },
  );

  const selectedConversation = useMemo(
    () => listQuery.data?.find((item) => item.id === selectedConversationId) ?? null,
    [listQuery.data, selectedConversationId],
  );

  const messagesQuery = useConversationMessages(selectedConversationId, {
    poll: Boolean(selectedConversationId),
  });

  const parkingLotsQuery = useQuery({
    queryKey: ['parking-lots'],
    queryFn: getParkingLots,
    enabled: securityDialogOpen,
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: getMyBookings,
    enabled: securityDialogOpen || customerCareDialogOpen,
  });

  const startSecurityMutation = useStartSecurityConversation();
  const startCustomerCareMutation = useStartCustomerCareConversation();
  const sendMessageMutation = useSendConversationMessage();

  const resetSecurityForm = () => {
    setSecurityLinkType('parkingLot');
    setSecurityParkingLotId('');
    setSecurityBookingId('');
    setSecurityMessage('');
  };

  const resetCustomerCareForm = () => {
    setCareSubject('');
    setCareBookingId('');
    setCareMessage('');
  };

  const handleStartSecurity = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const conversation = await startSecurityMutation.mutateAsync({
        parkingLotId:
          securityLinkType === 'parkingLot' && securityParkingLotId !== ''
            ? Number(securityParkingLotId)
            : undefined,
        bookingId:
          securityLinkType === 'booking' && securityBookingId !== ''
            ? Number(securityBookingId)
            : undefined,
        message: securityMessage,
      });

      setSecurityDialogOpen(false);
      resetSecurityForm();
      setSelectedConversationId(conversation.id);
      showSuccess('Security chat started');
    } catch (error) {
      showError(getApiErrorMessage(error, 'Could not start security chat'));
    }
  };

  const handleStartCustomerCare = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const conversation = await startCustomerCareMutation.mutateAsync({
        subject: careSubject.trim() || undefined,
        bookingId: careBookingId !== '' ? Number(careBookingId) : undefined,
        message: careMessage,
      });

      setCustomerCareDialogOpen(false);
      resetCustomerCareForm();
      setSelectedConversationId(conversation.id);
      showSuccess('Support chat started');
    } catch (error) {
      showError(getApiErrorMessage(error, 'Could not start support chat'));
    }
  };

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

  const showThreadPanel = !isMobile || selectedConversationId !== null;
  const showListPanel = !isMobile || selectedConversationId === null;

  return (
    <Stack spacing={3}>
      <PageHeader
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <HeaderActionButton
              onClick={() => setSecurityDialogOpen(true)}
              startIcon={<SecurityIcon />}
              variant="outlined"
            >
              Message Security
            </HeaderActionButton>
            <HeaderActionButton
              onClick={() => setCustomerCareDialogOpen(true)}
              startIcon={<ContactSupportOutlinedIcon />}
            >
              Customer Care
            </HeaderActionButton>
          </Stack>
        }
        description="Message security before you arrive or ask customer care for help."
        title="Support"
      />

      <QueryErrorAlert error={listQuery.error} fallbackMessage="Could not load conversations." />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 480 }}>
        {showListPanel ? (
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              flex: { md: '0 0 320px' },
              overflow: 'hidden',
              width: { xs: '100%', md: 320 },
            }}
          >
            <Stack spacing={1.5} sx={{ p: 2 }}>
              <Typography variant="subtitle1">Conversations</Typography>
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
                <ToggleButton value="ALL">All</ToggleButton>
                <ToggleButton value="OPEN">Open</ToggleButton>
                <ToggleButton value="RESOLVED">Resolved</ToggleButton>
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
                description="Start a security or customer-care chat to get help."
                illustration={getChatIllustration(null, 'emptyInbox')}
                illustrationMaxWidth={260}
                title="No conversations yet"
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
                          <Stack direction="row" flexWrap="wrap" gap={0.75}>
                            <Chip
                              label={formatConversationType(conversation.type)}
                              size="small"
                              variant="outlined"
                            />
                            <StatusChip status={conversation.status} />
                          </Stack>
                        }
                        secondary={
                          <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                            {conversation.subject ? (
                              <Typography variant="body2">{conversation.subject}</Typography>
                            ) : null}
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
                description="Choose a conversation from the list or start a new chat."
                illustration={getChatIllustration(null, 'selectThread')}
                illustrationMaxWidth={280}
                title="Select a conversation"
              />
            ) : (
              <>
                <Stack spacing={1} sx={{ borderBottom: '1px solid', borderColor: 'divider', p: 2 }}>
                  <Stack alignItems="center" direction="row" spacing={1.5}>
                    {isMobile ? (
                      <Button
                        onClick={() => setSelectedConversationId(null)}
                        size="small"
                        startIcon={<ArrowBack />}
                      >
                        Back
                      </Button>
                    ) : null}
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
                      <Illustration
                        alt=""
                        maxWidth={80}
                        name={getChatIllustration(selectedConversation.type, 'threadHeader')}
                      />
                    </Box>
                    <Typography sx={{ flex: 1, minWidth: 0 }} variant="h6">
                      {formatConversationType(selectedConversation.type)}
                    </Typography>
                    <StatusChip status={selectedConversation.status} />
                  </Stack>
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
                  {messagesQuery.data && messagesQuery.data.length === 0 ? (
                    <EmptyState
                      description="Send a message to continue the conversation."
                      illustration={getChatIllustration(selectedConversation.type, 'emptyMessages')}
                      illustrationMaxWidth={260}
                      title="No messages yet"
                    />
                  ) : null}
                  {messagesQuery.data && messagesQuery.data.length > 0 ? (
                    <ChatMessageList messages={messagesQuery.data} />
                  ) : null}
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
                      placeholder="Type your message"
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
                      Send
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
        ) : null}
      </Stack>

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => {
          setSecurityDialogOpen(false);
          resetSecurityForm();
        }}
        open={securityDialogOpen}
      >
        <Box component="form" onSubmit={handleStartSecurity}>
          <DialogTitle>Message security</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Illustration
                alt=""
                maxWidth={180}
                name={getChatIllustration('SECURITY', 'startSecurity')}
              />
              <Typography color="text.secondary" variant="body2">
                Message security before you arrive.
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                onChange={(_event, value: SecurityLinkType | null) => {
                  if (value) {
                    setSecurityLinkType(value);
                  }
                }}
                size="small"
                value={securityLinkType}
              >
                <ToggleButton value="parkingLot">Parking lot</ToggleButton>
                <ToggleButton value="booking">Booking</ToggleButton>
              </ToggleButtonGroup>
              {securityLinkType === 'parkingLot' ? (
                <FormControl fullWidth>
                  <InputLabel id="security-lot-label">Parking lot</InputLabel>
                  <Select
                    label="Parking lot"
                    labelId="security-lot-label"
                    onChange={(event) =>
                      setSecurityParkingLotId(event.target.value as number | '')
                    }
                    value={securityParkingLotId}
                  >
                    {(parkingLotsQuery.data ?? []).map((lot) => (
                      <MenuItem key={lot.id} value={lot.id}>
                        {lot.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl fullWidth>
                  <InputLabel id="security-booking-label">Booking</InputLabel>
                  <Select
                    label="Booking"
                    labelId="security-booking-label"
                    onChange={(event) =>
                      setSecurityBookingId(event.target.value as number | '')
                    }
                    value={securityBookingId}
                  >
                    {(bookingsQuery.data ?? []).map((booking) => (
                      <MenuItem key={booking.id} value={booking.id}>
                        {formatBookingNo(booking.id)} · {booking.bookingCode}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                fullWidth
                helperText={`${securityMessage.length}/${CONVERSATION_MESSAGE_MAX_LENGTH}`}
                inputProps={{ maxLength: CONVERSATION_MESSAGE_MAX_LENGTH }}
                label="Message"
                minRows={3}
                multiline
                onChange={(event) => setSecurityMessage(event.target.value)}
                required
                value={securityMessage}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSecurityDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={startSecurityMutation.isPending}
              type="submit"
              variant="contained"
            >
              Start chat
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => {
          setCustomerCareDialogOpen(false);
          resetCustomerCareForm();
        }}
        open={customerCareDialogOpen}
      >
        <Box component="form" onSubmit={handleStartCustomerCare}>
          <DialogTitle>Customer care</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Illustration
                alt=""
                maxWidth={180}
                name={getChatIllustration('CUSTOMER_CARE', 'startCustomerCare')}
              />
              <Typography color="text.secondary" variant="body2">
                Ask for help with booking, payment, check-in, or general support.
              </Typography>
              <TextField
                fullWidth
                label="Subject (optional)"
                onChange={(event) => setCareSubject(event.target.value)}
                value={careSubject}
              />
              <FormControl fullWidth>
                <InputLabel id="care-booking-label">Booking (optional)</InputLabel>
                <Select
                  label="Booking (optional)"
                  labelId="care-booking-label"
                  onChange={(event) => setCareBookingId(event.target.value as number | '')}
                  value={careBookingId}
                >
                  <MenuItem value="">None</MenuItem>
                  {(bookingsQuery.data ?? []).map((booking) => (
                    <MenuItem key={booking.id} value={booking.id}>
                      {formatBookingNo(booking.id)} · {booking.bookingCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                helperText={`${careMessage.length}/${CONVERSATION_MESSAGE_MAX_LENGTH}`}
                inputProps={{ maxLength: CONVERSATION_MESSAGE_MAX_LENGTH }}
                label="Message"
                minRows={3}
                multiline
                onChange={(event) => setCareMessage(event.target.value)}
                required
                value={careMessage}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCustomerCareDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={startCustomerCareMutation.isPending}
              type="submit"
              variant="contained"
            >
              Start chat
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Stack>
  );
}