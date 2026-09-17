/**
 * The NGO streak calendar only gives a boolean-per-week grid, so the current
 * streak (consecutive posted weeks counting back from the most recent) is
 * derived client-side rather than adding a dedicated backend field.
 *
 * Note the unit is **weeks**, not days — `/api/ngo/streaks/calendar` returns one
 * entry per week. Label it as weeks wherever it's shown.
 */
export function currentStreakFromWeeks(weeks: { posted: boolean }[]): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].posted) streak++;
    else break;
  }
  return streak;
}

/**
 * Longest run of consecutive posted weeks within the fetched window — there's no server-side
 * all-time max for NGOs (unlike nursery's `fulfilmentStreakMax`), so this is only as long as the
 * window requested from `fetchNgoStreakCalendar`.
 */
export function longestStreakFromWeeks(weeks: { posted: boolean }[]): number {
  let longest = 0;
  let running = 0;
  for (const week of weeks) {
    running = week.posted ? running + 1 : 0;
    if (running > longest) longest = running;
  }
  return longest;
}
