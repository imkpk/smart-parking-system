import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { InitiatePaymentRequestDto } from './dto/initiate-payment-request.dto';
import { PaymentClientResult } from './types/payment-client-result.type';

@Injectable()
export class PaymentClientService {
  private readonly paymentServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.paymentServiceUrl =
      this.configService.get<string>('PAYMENT_SERVICE_URL') ??
      'http://localhost:8081';
  }

  async initiatePayment(
    payload: InitiatePaymentRequestDto,
    authorizationHeader?: string,
  ): Promise<PaymentClientResult> {
    try {
      const response = await axios.post(
        `${this.paymentServiceUrl}/api/payments/initiate`,
        payload,
        {
          headers: authorizationHeader
            ? { Authorization: authorizationHeader }
            : undefined,
          timeout: 5000,
        },
      );

      return {
        paymentInitiated: true,
        payment: response.data?.data ?? response.data,
      };
    } catch (error) {
      return {
        paymentInitiated: false,
        paymentError: this.toPaymentError(error),
      };
    }
  }

  private toPaymentError(error: unknown) {
    if (axios.isAxiosError(error)) {
      return this.toAxiosPaymentError(error);
    }

    return 'Payment service unavailable';
  }

  private toAxiosPaymentError(error: AxiosError) {
    if (!error.response) {
      return 'Payment service unavailable';
    }

    if (error.response.status === 401 || error.response.status === 403) {
      return 'Payment service authorization failed';
    }

    return 'Payment service unavailable';
  }
}
