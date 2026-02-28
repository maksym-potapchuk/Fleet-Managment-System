import api from '@/lib/api';
import type { User } from '@/types/auth';

export function loginRequest(email: string, password: string) {
  return api.post('/auth/login/', { email, password });
}

export function logoutRequest() {
  return api.post('/auth/logout/');
}

export function getMeRequest() {
  return api.get<User>('/auth/me/');
}
