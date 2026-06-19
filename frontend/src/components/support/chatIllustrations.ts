import type { IllustrationName } from '../../assets/illustrations';
import type { ConversationType } from '../../types/conversation';

const securityChatIllustration: IllustrationName = 'securityGuardChat';

export function getChatIllustration(
  type: ConversationType | null | undefined,
  placement:
    | 'threadHeader'
    | 'emptyInbox'
    | 'selectThread'
    | 'emptyMessages'
    | 'startSecurity'
    | 'startCustomerCare',
): IllustrationName {
  if (placement === 'startSecurity') {
    return securityChatIllustration;
  }

  if (placement === 'startCustomerCare') {
    return 'customerCare';
  }

  if (type === 'SECURITY') {
    return securityChatIllustration;
  }

  if (placement === 'emptyMessages') {
    return 'messaging';
  }

  if (placement === 'selectThread') {
    return 'chatSupport';
  }

  if (placement === 'emptyInbox') {
    return 'customerCare';
  }

  return 'customerCare';
}