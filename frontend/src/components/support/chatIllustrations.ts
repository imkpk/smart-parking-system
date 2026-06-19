import type { IllustrationName } from '../../assets/illustrations';
import type { ConversationType } from '../../types/conversation';

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
    return 'securityCheck';
  }

  if (placement === 'startCustomerCare') {
    return 'customerCare';
  }

  if (placement === 'emptyMessages') {
    return 'messaging';
  }

  if (placement === 'selectThread') {
    return type === 'SECURITY' ? 'securityCheck' : 'chatSupport';
  }

  if (placement === 'emptyInbox') {
    return type === 'SECURITY' ? 'securityAlert' : 'customerCare';
  }

  return type === 'SECURITY' ? 'securityCheck' : 'customerCare';
}