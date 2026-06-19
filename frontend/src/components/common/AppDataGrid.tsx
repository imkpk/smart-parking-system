import { Paper, SxProps, Theme } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridOverlay,
  GridPaginationModel,
  GridRowId,
  GridRowSelectionModel,
  GridRowsProp,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { createContext, useContext, useMemo, useState } from 'react';
import type { IllustrationName } from '../../assets/illustrations';
import { CustomToolbar, type DataGridToolbarSearch } from '../../utils/CutsomToolbar';
import { EmptyState } from './EmptyState';

export type { DataGridToolbarSearch };

const DataGridSearchContext = createContext<DataGridToolbarSearch | undefined>(undefined);

/** Stable toolbar slot — do not use an inline `() => <CustomToolbar />` or the search input remounts each keystroke. */
function DataGridToolbarSlot() {
  const search = useContext(DataGridSearchContext);
  return <CustomToolbar search={search} />;
}

type EmptyStateConfig = {
  description?: string;
  illustration?: IllustrationName;
  title: string;
};

const DataGridEmptyStateContext = createContext<EmptyStateConfig | undefined>(undefined);

function DataGridEmptyStateOverlay() {
  const emptyState = useContext(DataGridEmptyStateContext);

  if (!emptyState) {
    return null;
  }

  return (
    <NoRowsOverlay
      description={emptyState.description}
      illustration={emptyState.illustration}
      title={emptyState.title}
    />
  );
}

const DENSITY_ROW_HEIGHT = {
  compact: 39,
  standard: 52,
  comfortable: 67,
} as const;

const GRID_CHROME_HEIGHT = 168;

type GridDensity = keyof typeof DENSITY_ROW_HEIGHT;

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

function getVisibleRowCount(
  rowCount: number,
  paginationModel: GridPaginationModel,
  loading: boolean,
) {
  if (loading) {
    return Math.min(paginationModel.pageSize, 5);
  }

  if (rowCount === 0) {
    return 3;
  }

  const startIndex = paginationModel.page * paginationModel.pageSize;
  if (startIndex >= rowCount) {
    return Math.min(paginationModel.pageSize, rowCount);
  }

  return Math.min(paginationModel.pageSize, rowCount - startIndex);
}

export function AppDataGrid<Row extends GridValidRowModel>({
  checkboxSelection = true,
  columns,
  density = 'standard',
  emptyState,
  getRowId,
  gridSx,
  loading = false,
  noRowsLabel = 'No rows',
  onRowClick,
  onRowSelectionModelChange,
  rowSelectionModel,
  rows,
  search,
}: {
  checkboxSelection?: boolean;
  columns: GridColDef<Row>[];
  density?: GridDensity;
  emptyState?: { description?: string; illustration?: IllustrationName; title: string };
  getRowId?: (row: Row) => GridRowId;
  gridSx?: SxProps<Theme>;
  loading?: boolean;
  noRowsLabel?: string;
  onRowClick?: (row: Row) => void;
  onRowSelectionModelChange?: (ids: GridRowId[]) => void;
  rowSelectionModel?: GridRowId[];
  rows: GridRowsProp<Row>;
  search?: DataGridToolbarSearch;
}) {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 5,
  });

  const gridRowSelectionModel: GridRowSelectionModel | undefined = rowSelectionModel
    ? {
        type: 'include',
        ids: new Set(rowSelectionModel),
      }
    : undefined;

  const rowCount = rows.length;
  const visibleRowCount = getVisibleRowCount(rowCount, paginationModel, loading);
  const gridHeight = useMemo(
    () =>
      GRID_CHROME_HEIGHT + visibleRowCount * DENSITY_ROW_HEIGHT[density],
    [density, visibleRowCount],
  );

  const hasEmptyState = Boolean(emptyState);
  const gridSlots = useMemo(
    () => ({
      toolbar: DataGridToolbarSlot,
      ...(hasEmptyState ? { noRowsOverlay: DataGridEmptyStateOverlay } : {}),
    }),
    [hasEmptyState],
  );

  return (
    <DataGridSearchContext.Provider value={search}>
      <DataGridEmptyStateContext.Provider value={emptyState}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <DataGrid
            checkboxSelection={checkboxSelection}
            columns={columns}
            density={density}
            disableRowSelectionOnClick
            getRowId={getRowId}
            loading={loading}
            localeText={{ noRowsLabel: emptyState ? '' : noRowsLabel }}
            onPaginationModelChange={setPaginationModel}
            onRowClick={
              onRowClick
                ? (params) => {
                    onRowClick(params.row as Row);
                  }
                : undefined
            }
            onRowSelectionModelChange={
              onRowSelectionModelChange
                ? (model) => onRowSelectionModelChange(Array.from(model.ids))
                : undefined
            }
            pageSizeOptions={[5, 10, 25, 50]}
            paginationModel={paginationModel}
            rowSelectionModel={gridRowSelectionModel}
            rows={rows}
            showToolbar
            slots={gridSlots}
            sx={{
              border: 0,
              height: gridHeight,
              width: '100%',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
              },
              '& .MuiDataGrid-cell': {
                alignItems: 'center',
                display: 'flex',
              },
              '& .MuiDataGrid-footerContainer': {
                bgcolor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-toolbarContainer': {
                borderBottom: '1px solid',
                borderColor: 'divider',
                p: 0,
              },
              '& .MuiDataGrid-virtualScroller': {
                overflowX: 'auto',
                overflowY: 'hidden',
              },
              ...(gridSx ?? {}),
            }}
          />
        </Paper>
      </DataGridEmptyStateContext.Provider>
    </DataGridSearchContext.Provider>
  );
}