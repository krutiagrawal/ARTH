import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([...ALLOWED_MIME_TYPES, 'application/pdf']);

interface PhotoInput {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

async function writeUpload(photo: PhotoInput, subdir: string): Promise<string> {
  const extension = path.extname(photo.filename) || '.jpg';
  const filename = `${randomUUID()}${extension}`;
  const dir = path.resolve(process.cwd(), env.UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const destination = path.join(dir, filename);

  await fs.promises.writeFile(destination, photo.buffer);

  return `/uploads/${subdir}/${filename}`;
}

async function saveImage(photo: PhotoInput, subdir: string): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(photo.mimetype)) {
    throw new BadRequestError('Unsupported image type. Please upload a JPEG, PNG, WEBP, or HEIC file.');
  }
  return writeUpload(photo, subdir);
}

// Registration/tax certificates are commonly scanned as PDFs, unlike every other upload in the
// app (logos, cover photos, verification photos) which is always a photo — this is the one place
// that also accepts application/pdf alongside the standard image types.
async function saveDocument(photo: PhotoInput, subdir: string): Promise<string> {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(photo.mimetype)) {
    throw new BadRequestError('Unsupported file type. Please upload a JPEG, PNG, WEBP, HEIC, or PDF file.');
  }
  return writeUpload(photo, subdir);
}

export function saveTreePhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'trees');
}

export function saveStorySnapshot(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'stories');
}

export function saveDrivePhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'drives');
}

export function saveAdoptableTreePhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'adoptable-trees');
}

export function saveCampaignPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'campaigns');
}

export function saveNgoLogo(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'ngo-logos');
}

export function saveGroupLogo(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'group-logos');
}

export function saveNurseryLogo(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'nursery-logos');
}

export function saveNurseryCoverPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'nursery-covers');
}

export function saveNurseryVerificationPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'nursery-verification');
}

export function saveStockPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'stock');
}

export function saveCorporateLogo(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'corporate-logos');
}

export function saveUpdatePhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'ngo-updates');
}

export function savePostMedia(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'posts');
}

export function savePortfolioMedia(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'portfolio');
}

export function saveStaffPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'staff');
}

export function saveHealthCheckPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'health-checks');
}

export function savePlantedTreePhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'planted-trees');
}

export function saveNgoVerificationDocument(photo: PhotoInput): Promise<string> {
  return saveDocument(photo, 'ngo-verification-docs');
}

export function saveNgoPastWorkPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'ngo-past-work');
}
