import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { notifyAccountNotApproved } from '../api/client';
import { useNgoProfile, useNurseryProfile } from './useApiQueries';

const MESSAGES = {
  pending: "Your application is under review. You can look around, but you can't take any actions until an admin approves it.",
  rejected: "Your application wasn't approved, so you can't take any actions. Update your profile and resubmit it for review.",
  suspended: "Your account is suspended, so you can't take any actions. Contact support for help.",
} as const;

/**
 * Puts the approval block on a CTA itself (e.g. "Add past work", "New drive") rather than on the
 * form's final Save button: wrap the button's handler in `guard(...)` and an unapproved NGO/nursery
 * gets the app-wide "not available yet" popup instead of the action. Approved accounts, and every
 * other role, run the handler untouched. The API enforces the same rule regardless.
 */
export function useRequireApproval() {
  const { user } = useAuth();
  const ngo = useNgoProfile(user?.role === 'ngo');
  const nursery = useNurseryProfile(user?.role === 'nursery');
  const status = user?.role === 'ngo' ? ngo.data?.status : user?.role === 'nursery' ? nursery.data?.status : 'approved';

  return useCallback(
    <Args extends any[]>(fn: (...args: Args) => void) =>
      (...args: Args) => {
        if (status && status !== 'approved') {
          notifyAccountNotApproved(MESSAGES[status as keyof typeof MESSAGES] ?? MESSAGES.pending);
          return;
        }
        fn(...args);
      },
    [status],
  );
}
