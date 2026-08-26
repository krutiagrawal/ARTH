import type { ApiUser } from '../api/auth';

// Where each role's login/splash routing lands.
export const ROLE_ROUTES: Record<ApiUser['role'], string> = {
  user: 'Main',
  ngo: 'NgoMain',
  group: 'GroupMain',
  nursery: 'NurseryMain',
  corporate: 'CorporateMain',
  admin: 'AdminMain',
};
