type PathnameListener = () => void;

let pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
const listeners = new Set<PathnameListener>();
let historyPatched = false;

function notifyPathnameListeners() {
  listeners.forEach((listener) => listener());
}

function patchHistoryMethod(method: 'pushState' | 'replaceState') {
  const original = history[method].bind(history);

  history[method] = (...args: Parameters<History['pushState']>) => {
    original(...args);
    pathname = window.location.pathname;
    notifyPathnameListeners();
  };
}

function ensureHistoryPatched() {
  if (historyPatched || typeof window === 'undefined') {
    return;
  }

  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');
  window.addEventListener('popstate', () => {
    pathname = window.location.pathname;
    notifyPathnameListeners();
  });
  historyPatched = true;
}

export function subscribePathname(listener: PathnameListener) {
  ensureHistoryPatched();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPathnameSnapshot() {
  return pathname;
}

export function getPathnameServerSnapshot() {
  return '/';
}