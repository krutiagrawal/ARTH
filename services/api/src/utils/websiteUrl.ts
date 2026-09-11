import { z } from 'zod';

/**
 * Prepends https:// when the user typed a bare domain (e.g. "www.example.com") instead of a
 * full URL — the plain z.string().url() rejects that outright even though it's the natural
 * thing to type into a "Website" field.
 */
function normalizeWebsiteUrl(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const websiteUrlSchema = z.preprocess(normalizeWebsiteUrl, z.string().url().max(300));
