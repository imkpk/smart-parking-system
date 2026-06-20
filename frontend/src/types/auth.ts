export type Role =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'ADMIN'
  | 'SECURITY'
  | 'USER';

export interface OrganizationSummary {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  organizationId: number | null;
  organization?: OrganizationSummary | null;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type OrganizationType = 'APARTMENT' | 'MALL' | 'HOSPITAL' | 'OFFICE' | 'PUBLIC';

export interface RegisterPayload {
  organizationName: string;
  organizationType: OrganizationType;
  name: string;
  email: string;
  phone?: string;
  password: string;
}