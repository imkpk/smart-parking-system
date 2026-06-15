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
