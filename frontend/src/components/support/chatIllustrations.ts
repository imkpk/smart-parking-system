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
    return 'securityChat';
  }

  if (placement === 'startCustomerCare') {
    return 'customerCare';
  }

  if (placement === 'emptyMessages') {
    return type === 'SECURITY' ? 'securityMessages' : 'messaging';
  }

  if (placement === 'selectThread') {
    return type === 'SECURITY' ? 'securitySurveillance' : 'chatSupport';
  }

  if (placement === 'emptyInbox') {
    return type === 'SECURITY' ? 'securityInbox' : 'customerCare';
  }

  return type === 'SECURITY' ? 'securityChat' : 'customerCare';
}