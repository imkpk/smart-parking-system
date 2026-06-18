import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppSnackbar } from './useAppSnackbar';

describe('useAppSnackbar', () => {
  it('starts with a closed snackbar', () => {
    const { result } = renderHook(() => useAppSnackbar());

    expect(result.current.snackbar).toBeNull();
  });

  it('shows an error snackbar', () => {
    const { result } = renderHook(() => useAppSnackbar());

    act(() => {
      result.current.showError('Something failed.');
    });

    expect(result.current.snackbar).toEqual({
      message: 'Something failed.',
      severity: 'error',
    });
  });

  it('shows a success snackbar', () => {
    const { result } = renderHook(() => useAppSnackbar());

    act(() => {
      result.current.showSuccess('Saved successfully.');
    });

    expect(result.current.snackbar).toEqual({
      message: 'Saved successfully.',
      severity: 'success',
    });
  });

  it('shows a warning snackbar', () => {
    const { result } = renderHook(() => useAppSnackbar());

    act(() => {
      result.current.showWarning('Please review this action.');
    });

    expect(result.current.snackbar).toEqual({
      message: 'Please review this action.',
      severity: 'warning',
    });
  });

  it('closes the snackbar', () => {
    const { result } = renderHook(() => useAppSnackbar());

    act(() => {
      result.current.showSuccess('Done.');
    });
    act(() => {
      result.current.closeSnackbar();
    });

    expect(result.current.snackbar).toBeNull();
  });
});