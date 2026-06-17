import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { AppSnackbar } from './AppSnackbar';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('renders search input and clears value when clear is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <SearchField
        label="Search bookings"
        onChange={onChange}
        onClear={onClear}
        placeholder="Search"
        value="abc"
      />,
    );

    expect(screen.getByLabelText(/search bookings/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    renderWithProviders(
      <EmptyState
        description="Try a different search."
        title="No bookings found"
      />,
    );

    expect(screen.getByText('No bookings found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search.')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders page title as heading', () => {
    renderWithProviders(<PageHeader title="Bookings" />);

    expect(screen.getByRole('heading', { name: /bookings/i })).toBeInTheDocument();
  });
});

describe('AppSnackbar', () => {
  it('shows snackbar message when open', () => {
    renderWithProviders(
      <AppSnackbar
        onClose={vi.fn()}
        snackbar={{ message: 'Booking created.', severity: 'success' }}
      />,
    );

    expect(screen.getByText('Booking created.')).toBeInTheDocument();
  });
});