export function formatJoinDate(createdAt?: string): string {
  if (!createdAt) return 'recently';
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function daysSince(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}
