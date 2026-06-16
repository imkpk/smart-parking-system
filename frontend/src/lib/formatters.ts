function formatPaddedNo(prefix: string, id: number) {
  return `${prefix}-${String(id).padStart(6, '0')}`;
}

export function formatBookingNo(id: number) {
  return formatPaddedNo('BK', id);
}

export function formatReceiptNo(id: number) {
  return formatPaddedNo('PAY', id);
}

export function formatSessionNo(id: number) {
  return formatPaddedNo('SES', id);
}

export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) {
    return '-';
  }

  return `${minutes} min`;
}

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) {
    return '-';
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'INR') {
  if (amount === null || amount === undefined) {
    return '-';
  }

  return `${currency} ${Number(amount).toFixed(2)}`;
}

export function formatRupees(amount: number | string | null | undefined) {
  if (amount === null || amount === undefined) {
    return '-';
  }

  return `₹${Number(amount).toFixed(2)}`;
}
