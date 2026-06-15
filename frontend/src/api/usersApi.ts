import { User } from '../types/auth';
import { apiClient } from './client';

export async function getUsers() {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
}
