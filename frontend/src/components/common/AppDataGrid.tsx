import { Box, Paper } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowsProp,
  GridToolbar,
  GridValidRowModel
} from '@mui/x-data-grid';

function AppGridToolbar() {
  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'flex-end',
        p: 1,
        width: '100%'
      }}
    >
      <GridToolbar />
    </Box>
  );
}

export function AppDataGrid<Row extends GridValidRowModel>({
  checkboxSelection = false,
  columns,
  getRowId,
  height = 500,
  loading = false,
  onRowSelectionModelChange,
  rowSelectionModel,
  rows
}: {
  checkboxSelection?: boolean;
  columns: GridColDef<Row>[];
  getRowId?: (row: Row) => GridRowId;
  height?: number | string;
  loading?: boolean;
  onRowSelectionModelChange?: (ids: GridRowId[]) => void;
  rowSelectionModel?: GridRowId[];
  rows: GridRowsProp<Row>;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        height,
        overflow: 'hidden'
      }}>
      <DataGrid
        checkboxSelection={checkboxSelection}
        columns={columns}
        disableRowSelectionOnClick
        getRowId={getRowId}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 5, page: 0 }
          }
        }}
        loading={loading}
        onRowSelectionModelChange={(model) =>
          onRowSelectionModelChange?.(Array.from(model))
        }
        pageSizeOptions={[5, 10, 25]}
        rowSelectionModel={rowSelectionModel}
        rows={rows}
        density="comfortable"
        slots={{ toolbar: AppGridToolbar }}
        sx={{
          border: 0,
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider'
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700
          },
          '& .MuiDataGrid-cell': {
            alignItems: 'center',
            display: 'flex'
          },
          '& .MuiDataGrid-footerContainer': {
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider'
          },
          '& .MuiDataGrid-toolbarContainer': {
            justifyContent: 'flex-end',
            p: 0
          }
        }}
      />
    </Paper>
  );
}
