// Screenshot storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise a
// local folder (development and tests), served by /api/files.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export function uploadProblem(file: File): string | null {
  if (!TYPES[file.type]) return 'Screenshot must be a PNG, JPG, WebP or GIF image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Screenshot is too large (max 3 MB).';
  if (file.size === 0) return 'Screenshot is empty.';
  return null;
}

const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || '.uploads');

/** Stores the image and returns the URL to save on the log. */
export async function saveScreenshot(file: File): Promise<string> {
  const problem = uploadProblem(file);
  if (problem) throw new Error(problem);
  const name = `${randomUUID()}.${TYPES[file.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`screenshots/${name}`, file, { access: 'public', contentType: file.type });
    return blob.url;
  }
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${name}`;
}

/** Reads a locally stored screenshot; null if the name is invalid or missing. */
export async function readLocalScreenshot(name: string): Promise<{ body: Buffer; type: string } | null> {
  const m = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.exec(name);
  if (!m) return null;
  try {
    const body = await readFile(path.join(uploadDir(), name));
    const type = Object.entries(TYPES).find(([, ext]) => ext === m[1])![0];
    return { body, type };
  } catch {
    return null;
  }
}
