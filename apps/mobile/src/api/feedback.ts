export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other';

export interface FeedbackPayload {
  rating: number | null;
  category: FeedbackCategory;
  message: string;
}

/**
 * TODO(smtp): deliver feedback by email once SMTP is configured (e.g. POST /api/feedback that
 * mails the support inbox). Until then this only simulates a successful send.
 */
export async function submitFeedback(_payload: FeedbackPayload): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 700));
}
