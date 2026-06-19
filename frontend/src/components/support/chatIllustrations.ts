import type { IllustrationName } from '../../assets/illustrations';
import type { ConversationType } from '../../types/conversation';

const securityChatIllustration: IllustrationName = 'securityGuardChat';
const customerCareIllustration: IllustrationName = 'adminSupportChat';

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
    return customerCareIllustration;
  }

  if (type === 'SECURITY') {
    return securityChatIllustration;
  }

  if (type === 'CUSTOMER_CARE') {
    return customerCareIllustration;
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