import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

interface PhotoInput {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

async function saveImage(photo: PhotoInput, subdir: string): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(photo.mimetype)) {
    throw new Error('Unsupported image type');
  }

  const extension = path.extname(photo.filename) || '.jpg';
  const filename = `${randomUUID()}${extension}`;
  const dir = path.resolve(process.cwd(), env.UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const destination = path.join(dir, filename);

  await fs.promises.writeFile(destination, photo.buffer);

  return `/uploads/${subdir}/${filename}`;
}

export function saveTreePhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'trees');
}

export function saveStorySnapshot(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'stories');
}
