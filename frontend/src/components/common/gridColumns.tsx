import { Visibility } from '@mui/icons-material';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { GridColDef, GridValidRowModel } from '@mui/x-data-grid';

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
