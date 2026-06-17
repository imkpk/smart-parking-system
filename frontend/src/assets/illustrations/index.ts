import analytics from './business-analytics.svg?url';
import booking from './booking.svg?url';
import cityDriver from './city-driver.svg?url';
import dashboard from './dashboard.svg?url';
import empty from './empty.svg?url';
import heatmap from './heatmap.svg?url';
import locationSearch from './location-search.svg?url';
import orderCar from './order-a-car.svg?url';
import park from './at-the-park.svg?url';
import payments from './payments.svg?url';
import receipt from './receipt.svg?url';
import secureLogin from './secure-login.svg?url';

/** Free unDraw illustrations (MIT). Primary accent uses --primary-svg-color. */
export const illustrations = {
  analytics,
  booking,
  cityDriver,
  dashboard,
  empty,
  heatmap,
  locationSearch,
  orderCar,
  park,
  payments,
  receipt,
  secureLogin,
} as const;

export type IllustrationName = keyof typeof illustrations;