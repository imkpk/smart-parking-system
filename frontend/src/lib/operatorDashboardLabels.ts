import { ActivityType } from '../types/operatorDashboard';

export function formatActivityTypeLabel(activityType: ActivityType) {
  return activityType === 'CHECK_IN' ? 'Check-in' : 'Check-out';
}