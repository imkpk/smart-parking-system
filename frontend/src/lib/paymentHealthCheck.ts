import { getPaymentServiceBaseUrl } from './apiEnv';

export async function checkPaymentServiceHealth(): Promise<boolean> {
  const baseUrl = getPaymentServiceBaseUrl();

  if (!baseUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/actuator/health`, {
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}