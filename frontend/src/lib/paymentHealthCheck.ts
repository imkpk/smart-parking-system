function getPaymentServiceBaseUrl(): string {
  const explicitUrl = import.meta.env.VITE_PAYMENT_SERVICE_URL?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  const apiBaseUrl = import.meta.env.VITE_PAYMENT_API_BASE_URL?.trim();

  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }

  return 'http://localhost:8081';
}

export async function checkPaymentServiceHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getPaymentServiceBaseUrl()}/actuator/health`, {
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}