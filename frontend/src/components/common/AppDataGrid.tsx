import { Paper } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridOverlay,
  GridRowId,
  GridRowSelectionModel,
  GridRowsProp,
  GridValidRowModel
} from '@mui/x-data-grid';
import { CustomToolbar } from '../../utils/CutsomToolbar';
import { EmptyState } from './EmptyState';

function NoRowsOverlay({
  description,
  title
}: {
  description?: string;
  title: string;
}) {
  return (
    <GridOverlay>
      <EmptyState description={description} title={title} />
    </GridOverlay>
  );
}

export function AppDataGrid<Row extends GridValidRowModel>({
  checkboxSelection = true,
  columns,
  emptyState,
  getRowId,
  height = 500,
  loading = false,
  noRowsLabel = 'No rows',
  onRowSelectionModelChange,
  rowSelectionModel,
  rows
}: {
  checkboxSelection?: boolean;
  columns: GridColDef<Row>[];
  emptyState?: { description?: string; title: string };
  getRowId?: (row: Row) => GridRowId;
  height?: number | string | Record<string, number | string>;
  loading?: boolean;
  noRowsLabel?: string;
  onRowSelectionModelChange?: (ids: GridRowId[]) => void;
  rowSelectionModel?: GridRowId[];
  rows: GridRowsProp<Row>;
}) {
  const gridRowSelectionModel: GridRowSelectionModel | undefined = rowSelectionModel
    ? {
        type: 'include',
        ids: new Set(rowSelectionModel)
      }
    : undefined;

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
        localeText={{ noRowsLabel: emptyState ? '' : noRowsLabel }}
        onRowSelectionModelChange={
          onRowSelectionModelChange
            ? (model) => onRowSelectionModelChange(Array.from(model.ids))
            : undefined
        }
        pageSizeOptions={[5, 10, 25]}
        rowSelectionModel={gridRowSelectionModel}
        rows={rows}
        density="comfortable"
        showToolbar
        slots={{
          toolbar: CustomToolbar,
          ...(emptyState
            ? {
                noRowsOverlay: () => (
                  <NoRowsOverlay
                    description={emptyState.description}
                    title={emptyState.title}
                  />
                )
              }
            : {})
        }}
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
