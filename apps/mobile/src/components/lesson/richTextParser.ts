// Pure (no React Native imports) so it can be unit-tested and reused. Rendering is in RichText.tsx.
/**
 * Parses a lesson section body written in a deliberately small markdown subset, so admins can
 * write long-form articles in a plain textarea:
 *
 *   blank line         paragraph break
 *   - item             bullet list (consecutive lines)
 *   > text             pull quote (consecutive lines)
 *   ### Heading        sub-heading inside a section
 *   !stat 17% | label  big-number callout
 *   **bold**           inline emphasis
 */
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'stat'; value: string; label: string };

export function parseRichText(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    if (list.length) blocks.push({ type: 'ul', items: list });
    if (quote.length) blocks.push({ type: 'quote', text: quote.join(' ') });
    para = [];
    list = [];
    quote = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('!stat ')) {
      flush();
      const [value, ...rest] = line.slice(6).split('|');
      blocks.push({ type: 'stat', value: value.trim(), label: rest.join('|').trim() });
    } else if (line.startsWith('### ')) {
      flush();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('- ')) {
      if (para.length || quote.length) flush();
      list.push(line.slice(2).trim());
    } else if (line.startsWith('> ')) {
      if (para.length || list.length) flush();
      quote.push(line.slice(2).trim());
    } else {
      if (list.length || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}
