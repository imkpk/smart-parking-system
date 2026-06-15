export function asMap<T extends { id: number }>(items: T[] | undefined) {
  return new Map((items ?? []).map((item) => [item.id, item]));
}
