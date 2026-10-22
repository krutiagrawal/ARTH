/**
 * A cancelled drive that has been relaunched is "rescheduled": the replacement stands for it. Left
 * counted, one real-world drive would show up twice (once cancelled, once live) in totals, trust
 * score and public lists. Spread `notRescheduled` into a `where` to leave the old record out.
 */
export const notRescheduled = { NOT: { status: 'cancelled' as const, relaunches: { some: {} } } };
