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
import parkingLogistics from './parking-logistics.svg?url';
import payments from './payments.svg?url';
import receipt from './receipt.svg?url';
import secureLogin from './secure-login.svg?url';
import securityAlert from './security-alert.svg?url';
import securityChat from './security-chat.svg?url';
import securityCheck from './security-check.jpg?url';
import securityGateCheck from './security-gate-check.jpg?url';
import securityInbox from './security-inbox.svg?url';
import securityMessages from './security-messages.svg?url';
import securitySurveillance from './security-surveillance.svg?url';

/** Free unDraw illustrations (MIT). Primary accent uses --primary-svg-color. */
export const illustrations = {
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
  parkingLogistics,
  payments,
  receipt,
  secureLogin,
  securityAlert,
  securityChat,
  securityCheck,
  securityGateCheck,
  securityInbox,
  securityMessages,
  securitySurveillance,
} as const;

export type IllustrationName = keyof typeof illustrations;