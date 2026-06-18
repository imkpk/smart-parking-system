import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { renderWithProviders } from '@/test/test-utils';
import { CustomToolbar } from '@/utils/CutsomToolbar';

const columns: GridColDef[] = [{ field: 'name', headerName: 'Name', flex: 1 }];
const rows = [{ id: 1, name: 'Alpha' }];

function renderToolbar(options?: { search?: boolean }) {
  const onChange = vi.fn();
  const onClear = vi.fn();

  renderWithProviders(
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        columns={columns}
        rows={rows}
        showToolbar
        slots={{
          toolbar: () =>
            options?.search === false ? (
              <CustomToolbar />
            ) : (
              <CustomToolbar
                search={{
                  value: 'alpha',
                  onChange,
                  onClear,
                  placeholder: 'Search rows',
                }}
              />
            ),
        }}
      />
    </div>,
  );

  return { onChange, onClear };
}

describe('CustomToolbar', () => {
  it('renders toolbar with external search field', async () => {
    const user = userEvent.setup();
    const { onChange, onClear } = renderToolbar();

    const searchInput = screen.getByPlaceholderText('Search rows');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('alpha');

    await user.type(searchInput, 'x');
    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders columns, filters, and export controls', async () => {
    const user = userEvent.setup();
    renderToolbar({ search: false });

    expect(screen.getByLabelText('Columns')).toBeInTheDocument();
    expect(screen.getByLabelText('Filters')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Export'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /print/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /download as csv/i })).toBeInTheDocument();
  });

  it('expands quick filter and clears the value', async () => {
    const user = userEvent.setup();
    renderToolbar({ search: false });

    const [searchTrigger] = screen.getAllByLabelText('Search');
    await user.click(searchTrigger);

    const quickFilterInput = screen.getByPlaceholderText('Search…');
    await user.type(quickFilterInput, 'alp');

    expect(quickFilterInput).toHaveValue('alp');

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(quickFilterInput).toHaveValue('');
  });
});