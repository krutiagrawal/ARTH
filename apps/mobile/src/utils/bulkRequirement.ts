/** True once a BulkRequirement's deadline has fully passed without being fulfilled — either the
 * backend has already flipped it to 'expired' (the steady-state signal), or the due date's
 * calendar day has passed but the scheduler hasn't ticked yet (≤15 min window). The due date's own
 * day still counts as on-time; overdue begins the day after. */
export function isBulkRequirementOverdue(req: { neededByDate: string | null; status: string }): boolean {
  if (req.status === 'expired') return true;
  if (!req.neededByDate || !['open', 'partially_fulfilled'].includes(req.status)) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(req.neededByDate) < startOfToday;
}
