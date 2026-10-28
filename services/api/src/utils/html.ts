const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text before it is placed inside an HTML email or receipt, so a name like `<a href=evil>` shows as text. */
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
