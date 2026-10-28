import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

type DetectedType = 'jpeg' | 'png' | 'webp' | 'heic' | 'pdf';

const EXTENSION_FOR: Record<DetectedType, string> = { jpeg: '.jpg', png: '.png', webp: '.webp', heic: '.heic', pdf: '.pdf' };
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

interface PhotoInput {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

// The client chooses both the filename and the Content-Type it claims, so neither can be trusted: an
// attacker could upload an .html page labelled image/png and have it served from our own domain. The
// real type is read from the file's leading bytes, and the stored extension comes from that — never
// from the uploaded filename.
export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'pdf';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && HEIC_BRANDS.has(buf.toString('ascii', 8, 12))) return 'heic';
  return null;
}

async function writeUpload(photo: PhotoInput, subdir: string, allowed: DetectedType[], rejectMessage: string): Promise<string> {
  const detected = detectFileType(photo.buffer);
  if (!detected || !allowed.includes(detected)) throw new BadRequestError(rejectMessage);

  const filename = `${randomUUID()}${EXTENSION_FOR[detected]}`;
  const dir = path.resolve(process.cwd(), env.UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const destination = path.join(dir, filename);

  await fs.promises.writeFile(destination, photo.buffer);

  return `/uploads/${subdir}/${filename}`;
}

async function saveImage(photo: PhotoInput, subdir: string): Promise<string> {
  return writeUpload(photo, subdir, ['jpeg', 'png', 'webp', 'heic'], 'Unsupported image type. Please upload a JPEG, PNG, WEBP, or HEIC file.');
}

// Registration/tax certificates are commonly scanned as PDFs, unlike every other upload in the
// app (logos, cover photos, verification photos) which is always a photo — this is the one place
// that also accepts a PDF alongside the standard image types.
async function saveDocument(photo: PhotoInput, subdir: string): Promise<string> {
  return writeUpload(photo, subdir, ['jpeg', 'png', 'webp', 'heic', 'pdf'], 'Unsupported file type. Please upload a JPEG, PNG, WEBP, HEIC, or PDF file.');
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

export function saveUserAvatar(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'avatars');
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

export function saveNgoAwardCertificate(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'ngo-awards');
}

export function saveNgoPastWorkPhoto(photo: PhotoInput): Promise<string> {
  return saveImage(photo, 'ngo-past-work');
}

/**
 * Best-effort removal of previously uploaded files (used when an account is erased). Only paths that
 * resolve inside the upload directory are touched, so a bad URL stored in the database can never make
 * this delete anything elsewhere on the server. Missing files and failures are ignored.
 */
export async function deleteUploadedFiles(urls: (string | null | undefined)[]): Promise<void> {
  const root = path.resolve(process.cwd(), env.UPLOAD_DIR);
  for (const url of urls) {
    if (!url || !url.startsWith('/uploads/')) continue;
    const target = path.resolve(root, url.slice('/uploads/'.length));
    if (!target.startsWith(root + path.sep)) continue;
    await fs.promises.unlink(target).catch(() => {});
  }
}
