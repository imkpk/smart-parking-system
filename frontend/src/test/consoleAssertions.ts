import { expect, vi } from 'vitest';

export function spyConsoleErrors() {
  const calls: unknown[][] = [];

  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    calls.push(args);
  });

  return {
    calls,
    restore: () => spy.mockRestore(),
    expectNone: (allowedPatterns: RegExp[] = []) => {
      const unexpected = calls.filter(
        (call) =>
          !allowedPatterns.some((pattern) => pattern.test(String(call[0] ?? ''))),
      );
      expect(unexpected).toEqual([]);
    },
  };
}