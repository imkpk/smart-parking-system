import { RecentActivityItem } from './operator-dashboard-metrics.type';

export interface RecentActivityPage {
  items: RecentActivityItem[];
  nextCursor: string | null;
  hasMore: boolean;
}