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

export function formatPersonName(name: string | null | undefined) {
  if (!name?.trim()) {
    return '';
  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

export function formatChatTime(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;

  if (Number.isNaN(timestamp)) {
    return '-';
  }

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Just now';
  }

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes} min ago`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hr ago`;
  }

  const days = Math.floor(diffMs / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
