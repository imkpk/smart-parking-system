import { resolveIotConfig } from '../../iot/iot.config';

export type PaymentServiceJwtConfig = {
  secret: string;
  issuer: string;
  audience: string;
  tokenTtlSeconds: number;
};

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

export function resolvePaymentServiceJwtConfig(
  env: NodeJS.ProcessEnv = process.env,
): PaymentServiceJwtConfig {
  return {
    secret: env.PAYMENT_SERVICE_JWT_SECRET ?? '',
    issuer: env.PAYMENT_SERVICE_JWT_ISSUER ?? 'smart-parking-backend',
    audience: env.PAYMENT_SERVICE_JWT_AUDIENCE ?? 'smart-parking-payment-service',
    tokenTtlSeconds: parsePositiveInt(env.PAYMENT_SERVICE_TOKEN_TTL_SECONDS, 60),
  };
}

export function validatePaymentServiceJwtConfig(
  config: PaymentServiceJwtConfig,
  iotEnabled: boolean = resolveIotConfig().enabled,
): void {
  if (!iotEnabled) {
    return;
  }

  if (!config.secret || config.secret.length < 32) {
    throw new Error(
      'PAYMENT_SERVICE_JWT_SECRET must be at least 32 characters when IOT_ENABLED=true',
    );
  }

  if (!config.issuer || config.issuer.trim().length === 0) {
    throw new Error('PAYMENT_SERVICE_JWT_ISSUER is required when IOT_ENABLED=true');
  }

  if (!config.audience || config.audience.trim().length === 0) {
    throw new Error('PAYMENT_SERVICE_JWT_AUDIENCE is required when IOT_ENABLED=true');
  }
}