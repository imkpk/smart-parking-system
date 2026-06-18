import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AppDataGrid } from '@/components/common/AppDataGrid';
import { AppLogo } from '@/components/common/AppLogo';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import { BookingStatusChip } from '@/components/common/BookingStatusChip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailsDialog } from '@/components/common/DetailsDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Illustration } from '@/components/common/Illustration';
import { InfoRows } from '@/components/common/InfoRows';
import {
  createBookingColumn,
  createDateTimeColumn,
  createDetailsColumn,
  createSessionColumn,
  createStatusColumn,
  createVehicleColumn,
} from '@/components/common/gridColumns';
import { PageHeader, ActionButtonGroup, HeaderActionButton, ToolbarButton } from '@/components/common/PageHeader';
import { ParkingEventStatusChip } from '@/components/common/ParkingEventStatusChip';
import { PaymentStatusChip } from '@/components/common/PaymentStatusChip';
import { QueryErrorAlert } from '@/components/common/QueryErrorAlert';
import { SearchField } from '@/components/common/SearchField';
import { SlotStatusChip } from '@/components/common/SlotStatusChip';
import { StatCard } from '@/components/common/StatCard';
import { StatusChip } from '@/components/common/StatusChip';
import { ThemeModeToggle } from '@/components/common/ThemeModeToggle';

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

  it('renders compact header description with tight title spacing', () => {
    renderWithProviders(
      <PageHeader compact description="Overview for Acme Parking" title="Dashboard" />,
    );

    const title = screen.getByRole('heading', { name: /dashboard/i });
    const description = screen.getByText(/overview for acme parking/i);

    expect(title).toHaveStyle({ marginBottom: '0px' });
    expect(description).toHaveStyle({ marginTop: '4px', marginBottom: '0px' });
  });
});

describe('HeaderActionButton', () => {
  it('renders a header action button', () => {
    renderWithProviders(<HeaderActionButton>Create booking</HeaderActionButton>);

    expect(screen.getByRole('button', { name: /create booking/i })).toBeInTheDocument();
  });
});

describe('ToolbarButton', () => {
  it('renders a toolbar button', () => {
    renderWithProviders(<ToolbarButton>Export</ToolbarButton>);

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});

describe('ActionButtonGroup', () => {
  it('renders grouped action buttons', () => {
    renderWithProviders(
      <ActionButtonGroup>
        <ToolbarButton>Filter</ToolbarButton>
        <HeaderActionButton>Add</HeaderActionButton>
      </ActionButtonGroup>,
    );

    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
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

describe('ConfirmDialog', () => {
  it('renders confirmation actions and handles confirm', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    renderWithProviders(
      <ConfirmDialog
        confirmLabel="Delete"
        description="This action cannot be undone."
        onClose={onClose}
        onConfirm={onConfirm}
        open
        title="Delete booking"
      />,
    );

    expect(screen.getByRole('heading', { name: /delete booking/i })).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DetailsDialog', () => {
  it('renders summary and technical rows', () => {
    renderWithProviders(
      <DetailsDialog
        onClose={vi.fn()}
        open
        summaryRows={[{ label: 'Booking', value: 'BK-001' }]}
        technicalRows={[{ label: 'ID', value: '1' }]}
        title="Booking details"
      />,
    );

    expect(screen.getByRole('heading', { name: /booking details/i })).toBeInTheDocument();
    expect(screen.getByText('Business Details')).toBeInTheDocument();
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    expect(screen.getByText('BK-001')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders label and value', () => {
    renderWithProviders(<StatCard label="Total Users" value={42} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('AppLogo', () => {
  it('renders brand text and logo image', () => {
    renderWithProviders(<AppLogo />);

    expect(screen.getByText('Smart Parking')).toBeInTheDocument();
    expect(screen.getByAltText('Smart Parking')).toBeInTheDocument();
  });
});

describe('QueryErrorAlert', () => {
  it('renders nothing when there is no error', () => {
    const { container } = renderWithProviders(
      <QueryErrorAlert error={null} fallbackMessage="Could not load data." />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders access denied for forbidden errors', () => {
    const error = new AxiosError('Forbidden');
    error.response = { status: 403 } as AxiosError['response'];

    renderWithProviders(
      <QueryErrorAlert error={error} fallbackMessage="Could not load data." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i);
  });

  it('renders fallback message for generic errors', () => {
    renderWithProviders(
      <QueryErrorAlert error={new Error('Network down')} fallbackMessage="Could not load data." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/could not load data/i);
  });
});

describe('ThemeModeToggle', () => {
  it('renders theme toggle button', () => {
    renderWithProviders(<ThemeModeToggle />);

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });
});

describe('Illustration', () => {
  it('renders illustration image', () => {
    renderWithProviders(<Illustration name="dashboard" />);

    expect(screen.getByAltText('dashboard illustration')).toBeInTheDocument();
  });
});

describe('InfoRows', () => {
  it('renders info rows', () => {
    renderWithProviders(
      <InfoRows rows={[{ label: 'Vehicle', value: 'KA01AB1234' }]} />,
    );

    expect(screen.getByText('Vehicle')).toBeInTheDocument();
    expect(screen.getByText('KA01AB1234')).toBeInTheDocument();
  });
});

describe('StatusChip', () => {
  it('formats and renders status label', () => {
    renderWithProviders(<StatusChip status="CONFIRMED" />);

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});

describe('BookingStatusChip', () => {
  it('renders booking status', () => {
    renderWithProviders(<BookingStatusChip status="PENDING" />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});

describe('ParkingEventStatusChip', () => {
  it('renders parking event status', () => {
    renderWithProviders(<ParkingEventStatusChip status="ACTIVE" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('PaymentStatusChip', () => {
  it('renders payment status', () => {
    renderWithProviders(<PaymentStatusChip status="SUCCESS" />);

    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});

describe('SlotStatusChip', () => {
  it('renders slot status', () => {
    renderWithProviders(<SlotStatusChip status="AVAILABLE" />);

    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});

describe('gridColumns helpers', () => {
  it('creates session and booking columns with formatted values', () => {
    const sessionColumn = createSessionColumn();
    const bookingColumn = createBookingColumn();

    expect(sessionColumn.valueGetter?.(undefined, { id: 7 })).toBe('SES-000007');
    expect(bookingColumn.valueGetter?.(undefined, { bookingId: 3 })).toBe('BK-000003');
  });

  it('creates vehicle, status, and datetime columns', () => {
    const vehicleColumn = createVehicleColumn((vehicleId) => `Vehicle ${vehicleId}`);
    const statusColumn = createStatusColumn((row: { status: string }) => row.status);
    const dateColumn = createDateTimeColumn(
      'startTime',
      'Start Time',
      (row: { startTime: string }) => row.startTime,
    );

    expect(vehicleColumn.valueGetter?.(undefined, { vehicleId: 9 })).toBe('Vehicle 9');
    expect(statusColumn.renderCell?.({ row: { status: 'ACTIVE' } } as never)).toBe('ACTIVE');
    expect(
      dateColumn.valueGetter?.(undefined, { startTime: '2026-06-18T10:00:00.000Z' }),
    ).not.toBe('-');
  });

  it('creates a details column that triggers onView', async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const column = createDetailsColumn(onView);
    const row = { id: 1 };

    renderWithProviders(<>{column.renderCell?.({ row } as never)}</>);

    await user.click(screen.getByRole('button'));
    expect(onView).toHaveBeenCalledWith(row);
  });
});

describe('AppDataGrid', () => {
  const columns = [{ field: 'name', headerName: 'Name', flex: 1 }];

  it('renders rows and column headers', () => {
    renderWithProviders(
      <AppDataGrid
        checkboxSelection={false}
        columns={columns}
        rows={[{ id: 1, name: 'Main Lot' }]}
      />,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Main Lot')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProviders(
      <AppDataGrid
        checkboxSelection={false}
        columns={columns}
        loading
        rows={[{ id: 1, name: 'Main Lot' }]}
      />,
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders empty state overlay when there are no rows', () => {
    renderWithProviders(
      <AppDataGrid
        checkboxSelection={false}
        columns={columns}
        emptyState={{
          description: 'Nothing to show yet.',
          title: 'No records found',
        }}
        rows={[]}
      />,
    );

    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
  });

  it('calls row selection callback when a row is selected', async () => {
    const user = userEvent.setup();
    const onRowSelectionModelChange = vi.fn();

    renderWithProviders(
      <AppDataGrid
        columns={columns}
        onRowSelectionModelChange={onRowSelectionModelChange}
        rows={[
          { id: 1, name: 'Alpha' },
          { id: 2, name: 'Beta' },
        ]}
      />,
    );

    const rowCheckbox = within(screen.getByText('Alpha').closest('[role="row"]')!).getByRole(
      'checkbox',
    );
    await user.click(rowCheckbox);

    expect(onRowSelectionModelChange).toHaveBeenCalledWith([1]);
  });

  it('renders default no-rows label when empty state is not provided', () => {
    renderWithProviders(
      <AppDataGrid checkboxSelection={false} columns={columns} noRowsLabel="No records" rows={[]} />,
    );

    expect(screen.getByText('No records')).toBeInTheDocument();
  });

  it('paginates across multiple pages of rows', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
    }));

    renderWithProviders(
      <AppDataGrid checkboxSelection={false} columns={columns} density="compact" rows={rows} />,
    );

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByText('Row 6')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /go to next page/i }));

    expect(screen.getByText('Row 6')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();
  });
});