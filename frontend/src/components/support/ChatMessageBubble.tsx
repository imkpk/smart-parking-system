import { Box, Paper, Stack, Typography } from '@mui/material';
import { formatDateTime } from '../../lib/formatters';
import { formatRole } from '../../lib/formatRole';
import { ConversationMessage } from '../../types/conversation';

export function ChatMessageBubble({ message }: { message: ConversationMessage }) {
  const isMine = message.isMine;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        width: '100%',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          bgcolor: isMine ? 'primary.main' : 'background.default',
          border: '1px solid',
          borderColor: isMine ? 'primary.main' : 'divider',
          color: isMine ? 'primary.contrastText' : 'text.primary',
          maxWidth: { xs: '88%', sm: '72%' },
          px: 1.5,
          py: 1.25,
        }}
      >
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 700, opacity: isMine ? 0.92 : 1 }} variant="caption">
            {message.sender.name} · {formatRole(message.sender.role)}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} variant="body2">
            {message.body}
          </Typography>
          <Typography
            sx={{ opacity: 0.8, textAlign: isMine ? 'right' : 'left' }}
            variant="caption"
          >
            {formatDateTime(message.createdAt)}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}