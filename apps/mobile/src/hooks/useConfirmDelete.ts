import { useCallback } from 'react';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError } from '../api/client';

/**
 * "Delete forever" confirm for drives, campaigns and trees. Runs `remove` after the NGO confirms;
 * if the server refuses (the item has RSVPs, donations, an adopter… – it explains why and what to
 * do instead), that explanation is shown rather than a generic failure.
 */
export function useConfirmDelete() {
  const confirm = useConfirm();
  return useCallback(
    (noun: string, name: string, remove: () => Promise<unknown>, onDone?: () => void) => {
      confirm(
        `Delete this ${noun}?`,
        `“${name}” will be permanently removed. This can’t be undone.`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await remove();
                onDone?.();
              } catch (e) {
                confirm(`Can’t delete this ${noun}`, e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
              }
            },
          },
        ],
      );
    },
    [confirm],
  );
}
