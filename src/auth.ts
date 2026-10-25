// Sign-in: GitHub for everyone (Google too, if its keys are set). Only people
// an admin has added as members (by email) can get in. A typed-email "dev login" exists for local testing and
// is never available on Vercel.
import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/server/db';

export const devLoginEnabled = process.env.AUTH_DEV_LOGIN === '1' && !process.env.VERCEL;

export const normalizeEmail = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();

async function isInvited(email: string | null | undefined) {
  const e = normalizeEmail(email);
  return Boolean(e) && (await prisma.member.count({ where: { email: e } })) > 0;
}

type GitHubEmail = { email: string; verified: boolean; primary: boolean };

// A GitHub account can have several verified emails. Sign in with whichever one
// an admin added, so people don't have to change their primary email.
async function memberEmailOnGitHub(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null;
  const res = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'devops-study-tracker' },
  });
  if (!res.ok) return null;
  const emails = ((await res.json()) as GitHubEmail[]).filter(e => e.verified);
  for (const e of emails) if (await isInvited(e.email)) return normalizeEmail(e.email);
  return normalizeEmail(emails.find(e => e.primary)?.email) || null;
}

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

const providers: Provider[] = [
  GitHub({
    authorization: { params: { scope: 'read:user user:email' } },
    async profile(profile, tokens) {
      return {
        id: String(profile.id),
        name: profile.name ?? profile.login,
        email: (await memberEmailOnGitHub(tokens.access_token)) ?? normalizeEmail(profile.email),
        image: profile.avatar_url,
      };
    },
  }),
];
if (googleEnabled) providers.push(Google);
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
