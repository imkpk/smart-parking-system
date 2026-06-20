import { User } from '../types/auth';
import { apiClient } from './client';

export interface UserSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  tenantAdmins: number;
  admins: number;
  security: number;
  users: number;
}

export async function getUsers() {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
}

export async function getUserSummary() {
  const response = await apiClient.get<UserSummary>('/users/summary');
  return response.data;
}