import { apiClient } from './client';
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types/auth';

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<AuthResponse>('/auth/register', payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}
