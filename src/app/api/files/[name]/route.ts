// Serves locally stored screenshots to signed-in members (production uses Vercel Blob URLs).
import { auth } from '@/auth';
import { readLocalScreenshot } from '@/server/storage';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response('Sign in first', { status: 401 });
  const file = await readLocalScreenshot((await params).name);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: { 'Content-Type': file.type, 'Cache-Control': 'private, max-age=86400' },
  });
}
