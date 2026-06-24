function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function withApiSuffix(url: string): string {
  const normalized = trimTrailingSlash(url);
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL?.trim();

  if (apiUrl) {
    return withApiSuffix(apiUrl);
  }

  const legacyUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (legacyUrl) {
    return legacyUrl;
  }

  return '';
}

export function getPaymentApiBaseUrl(): string {
  const serviceUrl = import.meta.env.VITE_PAYMENT_SERVICE_URL?.trim();

  if (serviceUrl) {
    return withApiSuffix(serviceUrl);
  }

  const legacyUrl = import.meta.env.VITE_PAYMENT_API_BASE_URL?.trim();

  if (legacyUrl) {
    return legacyUrl;
  }

  return '';
}

export function getPaymentServiceBaseUrl(): string {
  const serviceUrl = import.meta.env.VITE_PAYMENT_SERVICE_URL?.trim();

  if (serviceUrl) {
    return trimTrailingSlash(serviceUrl);
  }

  const apiBaseUrl = import.meta.env.VITE_PAYMENT_API_BASE_URL?.trim();

  if (apiBaseUrl) {
    return trimTrailingSlash(apiBaseUrl).replace(/\/api$/, '');
  }

  return '';
}