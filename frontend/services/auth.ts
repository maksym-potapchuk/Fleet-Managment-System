import api from '@/lib/api';
import type { User } from '@/types/auth';

export function loginRequest(email: string, password: string, rememberMe: boolean = false) {
  return api.post('/auth/login/', { email, password, remember_me: rememberMe });
}

export function logoutRequest() {
  return api.post('/auth/logout/');
}

export function getMeRequest() {
  return api.get<User>('/auth/me/');
}

export interface UserPreferences {
  kanban_column_order: string[];
  updated_at: string;
}

export function getPreferences() {
  return api.get<UserPreferences>('/auth/preferences/');
}

export function updatePreferences(data: Partial<Pick<UserPreferences, 'kanban_column_order'>>) {
  return api.patch<UserPreferences>('/auth/preferences/', data);
}
