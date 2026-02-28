export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_email_verified: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}
