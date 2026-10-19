// Sign-in: Google for everyone. Only people an admin has added as members
// (by email) can get in. A typed-email "dev login" exists for local testing and
// is never available on Vercel.
import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/server/db';

export const devLoginEnabled = process.env.AUTH_DEV_LOGIN === '1' && !process.env.VERCEL;

export const normalizeEmail = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();

async function isInvited(email: string | null | undefined) {
  const e = normalizeEmail(email);
  return Boolean(e) && (await prisma.member.count({ where: { email: e } })) > 0;
}

const providers: Provider[] = [Google];
if (devLoginEnabled) {
  providers.push(Credentials({
    id: 'dev',
    name: 'Dev login',
    credentials: { email: { label: 'Email', type: 'email' } },
    async authorize(credentials) {
      const email = normalizeEmail(credentials?.email as string);
      if (!(await isInvited(email))) return null;
      const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
      return { id: user.id, email: user.email, name: user.name };
    },
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT sessions keep the app stateless (and are required for the dev login).
  session: { strategy: 'jwt' },
  providers,
  pages: { signIn: '/signin', error: '/signin' },
  callbacks: {
    async signIn({ user }) {
      if (!(await isInvited(user.email))) return '/signin?error=not-invited';
      return true;
    },
  },
  trustHost: true,
});
