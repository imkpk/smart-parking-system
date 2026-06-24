export const SLOW_REQUEST_EVENT = 'smart-parking:slow-request';

export const SLOW_REQUEST_MESSAGE = 'Server is waking up, please wait...';

export function dispatchSlowRequestWarning() {
  window.dispatchEvent(new Event(SLOW_REQUEST_EVENT));
}