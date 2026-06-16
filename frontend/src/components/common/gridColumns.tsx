import { Visibility } from '@mui/icons-material';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { ReactNode } from 'react';
import { formatBookingNo, formatDateTime, formatSessionNo } from '../../lib/formatters';

export function createSessionColumn<Row extends GridValidRowModel & { id: number }>(
  getSessionNo: (sessionId: number) => string = formatSessionNo,
): GridColDef<Row> {
  return {
    field: 'id',
    headerName: 'Session No',
    minWidth: 130,
    valueGetter: (_value, row) => getSessionNo(row.id),
  };
}

export function createBookingColumn<Row extends GridValidRowModel & { bookingId: number }>(
  getBookingNo: (bookingId: number) => string = formatBookingNo,
): GridColDef<Row> {
  return {
    field: 'bookingId',
    flex: 1,
    headerName: 'Booking No',
    minWidth: 210,
    valueGetter: (_value, row) => getBookingNo(row.bookingId),
  };
}

export function createVehicleColumn<Row extends GridValidRowModel & { vehicleId: number }>(
  getVehicleLabel: (vehicleId: number) => string,
): GridColDef<Row> {
  return {
    field: 'vehicleId',
    headerName: 'Vehicle Number',
    minWidth: 160,
    valueGetter: (_value, row) => getVehicleLabel(row.vehicleId),
  };
}

export function createStatusColumn<Row extends GridValidRowModel>(
  renderStatus: (row: Row) => ReactNode,
): GridColDef<Row> {
  return {
    field: 'status',
    headerName: 'Status',
    minWidth: 130,
    renderCell: ({ row }) => renderStatus(row),
  };
}

export function createDateTimeColumn<Row extends GridValidRowModel>(
  field: string,
  headerName: string,
  getValue: (row: Row) => string | null | undefined,
  options?: Pick<GridColDef<Row>, 'flex' | 'minWidth'>,
): GridColDef<Row> {
  return {
    field,
    flex: options?.flex,
    headerName,
    minWidth: options?.minWidth ?? 190,
    valueGetter: (_value, row) => formatDateTime(getValue(row)),
  };
}

export function createDetailsColumn<Row extends GridValidRowModel>(
  onView: (row: Row) => void,
  tooltip = 'View Details',
): GridColDef<Row> {
  return {
    field: 'details',
    align: 'right',
    filterable: false,
    headerAlign: 'right',
    headerName: 'Details',
    minWidth: 110,
    sortable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" justifyContent="flex-end" width="100%">
        <Tooltip title={tooltip}>
          <IconButton onClick={() => onView(row)}>
            <Visibility />
          </IconButton>
        </Tooltip>
      </Stack>
    ),
  };
}
