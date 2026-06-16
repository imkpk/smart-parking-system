import { DetailsRow, DetailsRows } from './DetailsDialog';

export type InfoRow = DetailsRow;

export function InfoRows({ rows }: { rows: InfoRow[] }) {
  return <DetailsRows rows={rows} />;
}