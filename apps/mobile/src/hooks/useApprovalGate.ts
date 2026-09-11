import { useCallback, useState } from 'react';

// Blocks an action behind org approval status, popping the app's themed
// StatusModal (see components/common/StatusModal) instead of Alert.alert.
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | undefined | null;

const COPY: Record<'pending' | 'rejected' | 'suspended', { icon: string; title: string; message: (entity: string, reason?: string | null) => string }> = {
  pending: {
    icon: '⏳',
    title: 'Awaiting approval',
    message: (entity) => `Your ${entity} is still being reviewed by an admin. You'll be able to do this once it's approved.`,
  },
  rejected: {
    icon: '⚠️',
    title: 'Application rejected',
    message: (entity, reason) => reason || `Your ${entity} application was rejected. Update your profile and resubmit for review.`,
  },
  suspended: {
    icon: '🚫',
    title: 'Account suspended',
    message: (entity) => `Your ${entity} account has been suspended. Contact support for help.`,
  },
};

export function useApprovalGate(status: ApprovalStatus, entityLabel: string, rejectionReason?: string | null) {
  const [visible, setVisible] = useState(false);
  const isApproved = status === 'approved';

  const guard = useCallback(
    <Args extends any[]>(fn: (...args: Args) => void) =>
      (...args: Args) => {
        if (!isApproved) {
          setVisible(true);
          return;
        }
        fn(...args);
      },
    [isApproved],
  );

  const copy = COPY[(status as keyof typeof COPY) || 'pending'] ?? COPY.pending;

  return {
    isApproved,
    guard,
    statusModalProps: {
      visible,
      onClose: () => setVisible(false),
      icon: copy.icon,
      title: copy.title,
      message: copy.message(entityLabel, rejectionReason),
    },
  };
}
