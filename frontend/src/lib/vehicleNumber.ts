export function normalizeVehicleNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function formatVehicleNumber(value?: string | null): string {
  if (!value) {
    return '';
  }

  return normalizeVehicleNumber(value);
}