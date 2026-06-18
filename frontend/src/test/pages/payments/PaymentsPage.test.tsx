import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookings, getMyBookings } from '@/api/bookingsApi';
import {
  getPayments,
  getPaymentSummary,
  getUserPayments,
  mockPaymentFailure,
  mockPaymentSuccess,
  verifyRazorpayPayment,
} from '@/api/paymentsApi';
import { getUsers } from '@/api/usersApi';
import { getMyVehicles, getVehicles } from '@/api/vehiclesApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  createMockUser,
  getDataGridRowButton,
  getDataGridRowButtons,
  renderWithProviders,
} from '@/test/test-utils';
import { openRazorpayCheckout } from '@/lib/razorpayCheckout';
import { Payment } from '@/types/payment';
import { PaymentsPage } from '@/pages/payments/PaymentsPage';

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/api/paymentsApi', () => ({
  getPayments: vi.fn(),
  getPaymentSummary: vi.fn(),
  getUserPayments: vi.fn(),
  getPayment: vi.fn(),
  mockPaymentSuccess: vi.fn(),
  mockPaymentFailure: vi.fn(),
  verifyRazorpayPayment: vi.fn(),
}));

vi.mock('@/api/bookingsApi', () => ({
  getBookings: vi.fn(),
  getMyBookings: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/api/vehiclesApi', () => ({
  getVehicles: vi.fn(),
  getMyVehicles: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/api/usersApi', () => ({
  getUsers: vi.fn(),
}));

vi.mock('@/lib/razorpayCheckout', () => ({
  openRazorpayCheckout: vi.fn(),
}));

const mockPayment: Payment = {
  id: 1,
  parkingEventId: 10,
  bookingId: 5,
  userId: 2,
  amount: 150,
  currency: 'INR',
  status: 'INITIATED',
  paymentMethod: 'MOCK',
  provider: 'MOCK',
  gatewayOrderId: null,
  gatewayStatus: null,
  providerReference: 'REF-001',
  failureReason: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
};

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'ADMIN', id: 99 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(getPaymentSummary).mockResolvedValue({
      totalPayments: 1,
      successfulAmount: 150,
      paymentsByStatus: { INITIATED: 1, SUCCESS: 0, FAILED: 0, REFUNDED: 0 },
    });
    vi.mocked(getPayments).mockResolvedValue([mockPayment]);
    vi.mocked(getMyBookings).mockResolvedValue([]);
    vi.mocked(getMyVehicles).mockResolvedValue([]);
    vi.mocked(getBookings).mockResolvedValue([
      {
        id: 5,
        userId: 2,
        vehicleId: 3,
        slotId: 4,
        parkingLotId: 1,
        status: 'COMPLETED',
        startTime: '2026-06-18T10:00:00.000Z',
        endTime: '2026-06-18T18:00:00.000Z',
        bookingCode: 'BK-001',
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ]);
    vi.mocked(getVehicles).mockResolvedValue([
      {
        id: 3,
        userId: 2,
        vehicleNumber: 'KA01AB1234',
        vehicleType: 'CAR',
        brand: null,
        model: null,
        color: null,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    ]);
    vi.mocked(getUsers).mockResolvedValue([
      createMockUser({ id: 2, name: 'Pay User', email: 'pay@example.com' }),
    ]);
    vi.mocked(mockPaymentSuccess).mockResolvedValue({ ...mockPayment, status: 'SUCCESS' });
    vi.mocked(mockPaymentFailure).mockResolvedValue({ ...mockPayment, status: 'FAILED' });
    vi.mocked(verifyRazorpayPayment).mockResolvedValue({
      success: true,
      message: 'ok',
      data: { ...mockPayment, status: 'SUCCESS' },
      timestamp: '2026-06-18T00:00:00.000Z',
    });
  });

  it('renders admin payment list with summary stats', async () => {
    renderWithProviders(<PaymentsPage />);

    expect(screen.getByRole('heading', { name: /payments/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getPaymentSummary).toHaveBeenCalledTimes(1);
      expect(getPayments).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Total Payments')).toBeInTheDocument();
    expect(await screen.findByText('PAY-000001')).toBeInTheDocument();
    expect(screen.getByText('BK-000005')).toBeInTheDocument();
    expect(await screen.findByText('Pay User · pay@example.com')).toBeInTheDocument();
    expect(screen.getByText('KA01AB1234')).toBeInTheDocument();
    expect(screen.getAllByText('INR 150.00').length).toBeGreaterThan(0);
  });

  it('filters payments via search', async () => {
    const user = userEvent.setup();
    vi.mocked(getPayments).mockResolvedValue([
      mockPayment,
      { ...mockPayment, id: 2, providerReference: 'REF-XYZ' },
    ]);

    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    await user.type(
      screen.getByPlaceholderText(
        /search by receipt no, booking no, vehicle number, status, or payment reference/i,
      ),
      'REF-XYZ',
    );

    expect(screen.queryByText('PAY-000001')).not.toBeInTheDocument();
    expect(screen.getByText('PAY-000002')).toBeInTheDocument();
  });

  it('marks mock payment as success via admin action', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    const [, mockSuccessButton] = getDataGridRowButtons('PAY-000001');
    await user.click(mockSuccessButton);

    const confirmDialog = screen.getByRole('dialog', { name: /mock payment success/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /mark success/i }));

    await waitFor(() => {
      expect(mockPaymentSuccess).toHaveBeenCalled();
      expect(vi.mocked(mockPaymentSuccess).mock.calls[0]?.[0]).toBe(1);
    });

    expect(await screen.findByText('Payment marked SUCCESS.')).toBeInTheDocument();
  });

  it('marks mock payment as failed with custom reason', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    const [, , mockFailureButton] = getDataGridRowButtons('PAY-000001');
    await user.click(mockFailureButton);

    const failureDialog = await screen.findByRole('dialog', { name: /mock payment failure/i });
    const reasonField = within(failureDialog).getByLabelText(/failure reason/i);
    fireEvent.change(reasonField, { target: { value: 'Insufficient funds' } });
    await user.click(within(failureDialog).getByRole('button', { name: /mark failed/i }));

    await waitFor(() => {
      expect(mockPaymentFailure).toHaveBeenCalled();
      expect(vi.mocked(mockPaymentFailure).mock.calls[0]?.[0]).toEqual({
        id: 1,
        failureReason: 'Insufficient funds',
      });
    });

    expect(await screen.findByText('Payment marked FAILED.')).toBeInTheDocument();
  }, 30000);

  it('renders operational payments for SECURITY role without summary stats', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'SECURITY', id: 50 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithProviders(<PaymentsPage />);

    await waitFor(() => {
      expect(getPayments).toHaveBeenCalledTimes(1);
    });

    expect(getPaymentSummary).not.toHaveBeenCalled();
    expect(screen.queryByText('Total Payments')).not.toBeInTheDocument();
    expect(await screen.findByText('PAY-000001')).toBeInTheDocument();
    expect(screen.getByText('Customer #2')).toBeInTheDocument();
  });

  it('opens payment details dialog with gateway status and failure reason', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(getPayments).mockResolvedValue([
      {
        ...mockPayment,
        provider: 'RAZORPAY',
        paymentMethod: 'RAZORPAY',
        gatewayOrderId: 'order_test_456',
        gatewayStatus: 'failed',
        failureReason: 'Card declined',
      },
    ]);

    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    const [detailsButton] = getDataGridRowButtons('PAY-000001');
    await user.click(detailsButton);

    const dialog = screen.getByRole('dialog', { name: /payment details/i });
    expect(within(dialog).getByText('Gateway Order')).toBeInTheDocument();
    expect(within(dialog).getAllByText('order_test_456').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Gateway Status')).toBeInTheDocument();
    expect(within(dialog).getAllByText('failed').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Failure Reason')).toBeInTheDocument();
    expect(within(dialog).getByText('Card declined')).toBeInTheDocument();
  });

  it('completes Pay Now flow for RAZORPAY payment', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(getPayments).mockResolvedValue([
      {
        ...mockPayment,
        provider: 'RAZORPAY',
        paymentMethod: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      },
    ]);
    vi.mocked(openRazorpayCheckout).mockImplementation(async ({ onSuccess }) => {
      await onSuccess({
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'signature_test',
      });
    });

    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    await user.click(getDataGridRowButton('PAY-000001', /pay now/i));

    await waitFor(() => {
      expect(openRazorpayCheckout).toHaveBeenCalled();
      expect(verifyRazorpayPayment).toHaveBeenCalled();
      expect(vi.mocked(verifyRazorpayPayment).mock.calls[0]?.[0]).toEqual({
        paymentId: 1,
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_456',
        razorpaySignature: 'signature_test',
      });
    });

    expect(await screen.findByText('Payment completed successfully.')).toBeInTheDocument();
  });

  it('shows summary API error alert for admin', async () => {
    vi.mocked(getPaymentSummary).mockRejectedValue(new Error('Summary unavailable'));

    renderWithProviders(<PaymentsPage />);

    expect(
      await screen.findByRole('alert', { name: '' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/could not load payment summary/i)).toBeInTheDocument();
  });

  it('shows empty search state for admin when no payments match', async () => {
    const user = userEvent.setup();
    vi.mocked(getPayments).mockResolvedValue([mockPayment]);

    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    await user.type(
      screen.getByPlaceholderText(
        /search by receipt no, booking no, vehicle number, status, or payment reference/i,
      ),
      'ZZZNOMATCH',
    );

    expect(screen.getByText('No matching payments')).toBeInTheDocument();
    expect(
      screen.getByText(
        /try a receipt no, booking no, vehicle number, status, or payment reference/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('PAY-000001')).not.toBeInTheDocument();
  });

  it('shows payment cancelled message when Razorpay checkout is dismissed', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(getPayments).mockResolvedValue([
      {
        ...mockPayment,
        provider: 'RAZORPAY',
        paymentMethod: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      },
    ]);
    vi.mocked(openRazorpayCheckout).mockImplementation(async ({ onDismiss }) => {
      onDismiss?.();
    });

    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    await user.click(getDataGridRowButton('PAY-000001', /pay now/i));

    expect(await screen.findByText('Payment was cancelled.')).toBeInTheDocument();
  });

  it('shows Razorpay checkout error message', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(getPayments).mockResolvedValue([
      {
        ...mockPayment,
        provider: 'RAZORPAY',
        paymentMethod: 'RAZORPAY',
        gatewayOrderId: 'order_test_123',
      },
    ]);
    vi.mocked(openRazorpayCheckout).mockImplementation(async ({ onError }) => {
      onError('Checkout failed');
    });

    renderWithProviders(<PaymentsPage />);
    await screen.findByText('PAY-000001');

    await user.click(getDataGridRowButton('PAY-000001', /pay now/i));

    expect(await screen.findByText('Checkout failed')).toBeInTheDocument();
  });

  it('shows user payment history empty state', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getUserPayments).mockResolvedValue([]);

    renderWithProviders(<PaymentsPage />);

    expect(await screen.findByText('You have no payment history yet')).toBeInTheDocument();
  });

  it('loads user payments for USER role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ role: 'USER', id: 2 }),
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getUserPayments).mockResolvedValue([mockPayment]);

    renderWithProviders(<PaymentsPage />);

    await waitFor(() => {
      expect(getUserPayments).toHaveBeenCalledWith(2);
    });

    expect(getPayments).not.toHaveBeenCalled();
    expect(getPaymentSummary).not.toHaveBeenCalled();
    expect(await screen.findByText('PAY-000001')).toBeInTheDocument();
  });
});