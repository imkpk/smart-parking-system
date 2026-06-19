import adminSupportChat from './admin-support-chat.svg?url';
import analytics from './business-analytics.svg?url';
import booking from './booking.svg?url';
import chatSupport from './chat-support.svg?url';
import cityDriver from './city-driver.svg?url';
import customerCare from './customer-care.svg?url';
import dashboard from './dashboard.svg?url';
import empty from './empty.svg?url';
import gateEntrance from './gate-entrance.svg?url';
import heatmap from './heatmap.svg?url';
import locationSearch from './location-search.svg?url';
import messaging from './messaging.svg?url';
import orderCar from './order-a-car.svg?url';
import park from './at-the-park.svg?url';
import payments from './payments.svg?url';
import receipt from './receipt.svg?url';
import secureLogin from './secure-login.svg?url';
import securityGateCheck from './security-gate-check.jpg?url';
import securityGuardChat from './security-guard-chat.svg?url';

/** Curated bundled illustrations. unDraw SVGs use --primary-svg-color for tinting. */
export const illustrations = {
  adminSupportChat,
  analytics,
  booking,
  chatSupport,
  cityDriver,
  customerCare,
  dashboard,
  empty,
  gateEntrance,
  heatmap,
  locationSearch,
  messaging,
  orderCar,
  park,
  payments,
  receipt,
  secureLogin,
  securityGateCheck,
  securityGuardChat,
} as const;

export type IllustrationName = keyof typeof illustrations;