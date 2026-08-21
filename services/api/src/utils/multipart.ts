import { MultipartFile } from '@fastify/multipart';

export function splitMultipartBody(
  body: Record<string, MultipartFile | { value: string }> | undefined,
  fileFieldName = 'photo',
) {
  const fields: Record<string, string> = {};
  let file: MultipartFile | undefined;

  for (const [key, part] of Object.entries(body ?? {})) {
    if ((part as MultipartFile).file !== undefined || (part as MultipartFile).toBuffer) {
      if (key === fileFieldName) file = part as MultipartFile;
    } else {
      fields[key] = (part as { value: string }).value;
    }
  }

  return { fields, file };
}
