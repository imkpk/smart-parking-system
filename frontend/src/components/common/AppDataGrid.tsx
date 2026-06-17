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
import type { IllustrationName } from '../../assets/illustrations';
import { CustomToolbar, type DataGridToolbarSearch } from '../../utils/CutsomToolbar';
import { EmptyState } from './EmptyState';

export type { DataGridToolbarSearch };

function NoRowsOverlay({
  description,
  illustration,
  title,
}: {
  description?: string;
  illustration?: IllustrationName;
  title: string;
}) {
  return (
    <GridOverlay>
      <EmptyState description={description} illustration={illustration} title={title} />
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
  rows,
  search,
}: {
  checkboxSelection?: boolean;
  columns: GridColDef<Row>[];
  emptyState?: { description?: string; illustration?: IllustrationName; title: string };
  getRowId?: (row: Row) => GridRowId;
  height?: number | string | Record<string, number | string>;
  loading?: boolean;
  noRowsLabel?: string;
  onRowSelectionModelChange?: (ids: GridRowId[]) => void;
  rowSelectionModel?: GridRowId[];
  rows: GridRowsProp<Row>;
  search?: DataGridToolbarSearch;
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
          toolbar: () => <CustomToolbar search={search} />,
          ...(emptyState
            ? {
                noRowsOverlay: () => (
                  <NoRowsOverlay
                    description={emptyState.description}
                    illustration={emptyState.illustration}
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
            borderBottom: '1px solid',
            borderColor: 'divider',
            p: 0,
          },
        }}
      />
    </Paper>
  );
}
