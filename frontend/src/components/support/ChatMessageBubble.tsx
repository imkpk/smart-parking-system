import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatChatTime } from '../../lib/formatters';
import { formatRole } from '../../lib/formatRole';
import { ConversationMessage } from '../../types/conversation';

function isGroupedWithPrevious(
  message: ConversationMessage,
  previous: ConversationMessage | undefined,
) {
  if (!previous) {
    return false;
  }

  return previous.isMine === message.isMine && previous.sender.name === message.sender.name;
}

export function ChatMessageBubble({
  message,
  showSender = true,
}: {
  message: ConversationMessage;
  showSender?: boolean;
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const isMine = message.isMine;

  const receivedBg = isLight
    ? theme.palette.background.paper
    : alpha(theme.palette.common.white, 0.08);

  return (
    <Box
      sx={{
        alignItems: isMine ? 'flex-end' : 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {!isMine && showSender ? (
        <Typography
          color="text.secondary"
          sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.25, px: 0.5 }}
          variant="caption"
        >
          {message.sender.name} · {formatRole(message.sender.role)}
        </Typography>
      ) : null}
      <Box
        sx={{
          bgcolor: isMine ? 'primary.main' : receivedBg,
          border: isLight && !isMine ? '1px solid' : 'none',
          borderColor: isLight && !isMine ? alpha(theme.palette.text.primary, 0.08) : undefined,
          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          boxShadow:
            isLight && !isMine ? `0 1px 2px ${alpha(theme.palette.text.primary, 0.08)}` : 'none',
          color: isMine ? 'primary.contrastText' : 'text.primary',
          maxWidth: { xs: '85%', sm: '68%' },
          minWidth: 72,
          px: 1.5,
          py: 1,
        }}
      >
        <Box
          sx={{
            alignItems: 'flex-end',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            justifyContent: 'flex-end',
          }}
        >
          <Typography
            sx={{
              flex: '1 1 auto',
              fontSize: '0.9375rem',
              lineHeight: 1.45,
              minWidth: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            variant="body2"
          >
            {message.body}
          </Typography>
          <Typography
            component="span"
            sx={{
              color: isMine
                ? alpha(theme.palette.primary.contrastText, 0.78)
                : isLight
                  ? alpha(theme.palette.text.secondary, 0.9)
                  : 'text.secondary',
              flexShrink: 0,
              fontSize: '0.6875rem',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
            variant="caption"
          >
            {formatChatTime(message.createdAt)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function ChatMessageList({ messages }: { messages: ConversationMessage[] }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Box
      sx={{
        bgcolor: isLight ? 'background.default' : 'transparent',
        minHeight: '100%',
        mx: -2,
        my: -2,
        px: 2,
        py: 2,
      }}
    >
      <Stack spacing={0}>
        {messages.map((message, index) => {
          const previous = index > 0 ? messages[index - 1] : undefined;
          const grouped = isGroupedWithPrevious(message, previous);

          return (
            <Box key={message.id} sx={{ mt: grouped ? 0.25 : 1 }}>
              <ChatMessageBubble message={message} showSender={!grouped && !message.isMine} />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}