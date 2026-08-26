import { MultipartFile } from '@fastify/multipart';

type MultipartBody = Record<string, MultipartFile | { value: string } | Array<MultipartFile | { value: string }>> | undefined;

function isFilePart(part: unknown): part is MultipartFile {
  const p = part as MultipartFile;
  return p != null && (p.file !== undefined || typeof p.toBuffer === 'function');
}

/**
 * Single-file form: every scalar field plus at most one file, read from `fileFieldName`.
 * Used by every route that takes one image (drive cover, NGO logo, staff photo, ...).
 */
export function splitMultipartBody(body: MultipartBody, fileFieldName = 'photo') {
  const fields: Record<string, string> = {};
  let file: MultipartFile | undefined;

  for (const [key, part] of Object.entries(body ?? {})) {
    // With `attachFieldsToBody`, repeating a field name gives an array rather than a single
    // part — flatten before inspecting so a stray repeat doesn't silently become a field.
    const parts = Array.isArray(part) ? part : [part];
    for (const p of parts) {
      if (isFilePart(p)) {
        if (key === fileFieldName && !file) file = p;
      } else {
        fields[key] = (p as { value: string }).value;
      }
    }
  }

  return { fields, file };
}

/**
 * Multi-file form: same scalar fields, but every file sent under `fileFieldName` is returned in
 * the order the client appended it. `@fastify/multipart` collapses a single repeat to one part
 * and only produces an array from the second file on, so both shapes are normalised here.
 *
 * Callers must still enforce their own count ceiling — the plugin's `files` limit aborts the
 * whole request, which reads to the user as a network failure rather than "too many photos".
 */
export function splitMultipartFiles(body: MultipartBody, fileFieldName = 'photos') {
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];

  for (const [key, part] of Object.entries(body ?? {})) {
    const parts = Array.isArray(part) ? part : [part];
    for (const p of parts) {
      if (isFilePart(p)) {
        if (key === fileFieldName) files.push(p);
      } else {
        fields[key] = (p as { value: string }).value;
      }
    }
  }

  return { fields, files };
}
