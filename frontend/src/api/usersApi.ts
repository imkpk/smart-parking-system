import { Role, User } from '../types/auth';
import { apiClient } from './client';

export interface CreateUserPayload {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role: Role;
}

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

export async function createUser(payload: CreateUserPayload) {
  const response = await apiClient.post<User>('/users', payload);
  return response.data;
}