import { ApiError } from '../api/client';
import type { BulkHealthConflictMode } from '../api/plantedTrees';
import type { ConfirmButton } from '../components/common/ConfirmDialog';

type Confirm = (title: string, message?: string, buttons?: ConfirmButton[], icon?: string) => void;

/**
 * Runs a bulk health check and handles trees that already have a check today: the server answers
 * 409 with how many, and the user chooses to override those with the new status or to update only
 * the ones not yet checked today – the bulk version of the single-tree "already checked today" prompt.
 */
export async function runBulkHealthCheck(
  confirm: Confirm,
  run: (onConflict: BulkHealthConflictMode) => Promise<unknown>,
  onDone?: () => void,
): Promise<void> {
  const attempt = async (mode: BulkHealthConflictMode) => {
    try {
      await run(mode);
      onDone?.();
    } catch (e) {
      const details = e instanceof ApiError && e.code === 'CONFLICT'
        ? (e.details as { alreadyCheckedCount?: number; totalCount?: number } | undefined)
        : undefined;
      if (!details?.alreadyCheckedCount || !details.totalCount) {
        confirm('Could not update', e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
        return;
      }
      const already = details.alreadyCheckedCount;
      const rest = details.totalCount - already;
      const buttons: ConfirmButton[] = [{ text: 'Cancel', style: 'cancel' }];
      if (rest > 0) buttons.push({ text: `Only the ${rest} not checked today`, onPress: () => void attempt('skip') });
      buttons.push({ text: rest > 0 ? 'Override all' : 'Override', onPress: () => void attempt('override') });
      confirm(
        'Already checked today',
        already === details.totalCount
          ? `All ${already} of these trees already have a health check from today. Replace today's check with the new status?`
          : `${already} of these ${details.totalCount} trees already have a health check from today. Replace today's check on those, or update only the ${rest} that weren't checked today?`,
        buttons,
      );
    }
  };
  await attempt('ask');
}
