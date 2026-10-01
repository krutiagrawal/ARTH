import type { ApiUser } from '../api/auth';

// Where each role's login/splash routing lands.
export const ROLE_ROUTES: Record<ApiUser['role'], string> = {
  user: 'Main',
  ngo: 'NgoMain',
  group: 'GroupMain',
  nursery: 'NurseryMain',
  corporate: 'CorporateMain',
  admin: 'AdminMain',
  delivery_partner: 'DeliveryPartnerMain',
};

/**
 * Same as ROLE_ROUTES, but an Individual who hasn't finished (or skipped) the post-signup
 * personalization quiz gets routed back into it instead of Main — so closing/reopening the app,
 * or logging in again elsewhere, can't be used to bypass it.
 */
export function resolvePostAuthRoute(user: Pick<ApiUser, 'role' | 'personalizationCompletedAt'>): string {
  if (user.role === 'user' && !user.personalizationCompletedAt) return 'PersonalizeOnboarding';
  return ROLE_ROUTES[user.role] ?? 'Main';
}
