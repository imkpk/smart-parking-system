import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  PAYMENT_CLIENT_TIMEOUT_MS,
  PAYMENT_ERRORS,
} from './constants/payment-client.constants';
import { InitiatePaymentRequestDto } from './dto/initiate-payment-request.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentServiceJwtService } from './payment-service-jwt.service';
import { PaymentAuthContext } from './types/payment-auth-context.type';
import { PaymentClientResult } from './types/payment-client-result.type';

@Injectable()
export class PaymentClientService {
  private readonly paymentServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentServiceJwtService: PaymentServiceJwtService,
  ) {
    this.paymentServiceUrl =
      this.configService.get<string>('PAYMENT_SERVICE_URL') ??
      'http://localhost:8081';
  }

  async initiatePayment(
    payload: InitiatePaymentRequestDto,
    authContext?: PaymentAuthContext,
  ): Promise<PaymentClientResult> {
    if (payload.amount < 0.01) {
      return {
        paymentInitiated: false,
        paymentError: PAYMENT_ERRORS.INVALID_AMOUNT,
      };
    }

    try {
      const response = await axios.post(
        `${this.paymentServiceUrl}/api/payments/initiate`,
        payload,
        {
          headers: this.buildPaymentHeaders(authContext),
          timeout: PAYMENT_CLIENT_TIMEOUT_MS,
        },
      );

      return {
        paymentInitiated: true,
        payment: this.unwrapPaymentResponse(response.data),
      };
    } catch (error) {
      return {
        paymentInitiated: false,
        paymentError: this.toPaymentError(error),
      };
    }
  }

  private buildPaymentHeaders(authContext?: PaymentAuthContext) {
    if (!authContext || authContext.type === 'user') {
      const authorizationHeader = authContext?.authorizationHeader;

      return authorizationHeader
        ? { Authorization: authorizationHeader }
        : undefined;
    }

    const serviceToken = this.paymentServiceJwtService.signInitiateToken({
      organizationId: authContext.organizationId,
      trigger: authContext.trigger,
    });

    return {
      Authorization: `Bearer ${serviceToken}`,
    };
  }

  private unwrapPaymentResponse(data: unknown): PaymentResponseDto {
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: PaymentResponseDto }).data;
    }

    return data as PaymentResponseDto;
  }

  private toPaymentError(error: unknown) {
    if (axios.isAxiosError(error)) {
      return this.toAxiosPaymentError(error);
    }

    return PAYMENT_ERRORS.UNAVAILABLE;
  }

  private toAxiosPaymentError(error: AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return PAYMENT_ERRORS.TIMED_OUT;
    }

    if (!error.response) {
      return PAYMENT_ERRORS.UNAVAILABLE;
    }

    if (error.response.status === 401 || error.response.status === 403) {
      return PAYMENT_ERRORS.AUTHORIZATION_FAILED;
    }

    return PAYMENT_ERRORS.UNAVAILABLE;
  }
}