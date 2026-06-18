import { AdminSummary, SlotStatusSummary } from '../types/dashboard';
import { OperatorDashboardMetrics, RecentActivityPage } from '../types/operatorDashboard';
import { apiClient } from './client';

export type RecentActivityQuery = {
  limit?: number;
  cursor?: string;
};

export async function getAdminSummary() {
  const response = await apiClient.get<AdminSummary>('/dashboard/admin-summary');
  return response.data;
}

export async function getSlotStatusSummary() {
  const response = await apiClient.get<SlotStatusSummary>('/dashboard/slot-status-summary');
  return response.data;
}

export async function getOperatorMetrics() {
  const response = await apiClient.get<OperatorDashboardMetrics>('/dashboard/operator-metrics');
  return response.data;
}

export async function getRecentActivity(query: RecentActivityQuery = {}) {
  const response = await apiClient.get<RecentActivityPage>('/dashboard/recent-activity', {
    params: query,
  });
  return response.data;
}
