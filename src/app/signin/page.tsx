import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, devLoginEnabled, googleEnabled, signIn } from '@/auth';

const MESSAGES: Record<string, string> = {
  'not-invited': 'None of the verified emails on that account is a member yet. Ask an admin to add your email in Settings.',
  CredentialsSignin: 'That email isn’t a member of the group yet.',
  AccessDenied: 'That account isn’t a member of the group yet. Ask an admin to add your email in Settings.',
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await auth();
  if (session?.user && !error) redirect('/');

  async function github() {
    'use server';
    await signIn('github', { redirectTo: '/' });
  }
  async function google() {
    'use server';
    await signIn('google', { redirectTo: '/' });
  }
  async function dev(form: FormData) {
    'use server';
    try {
      await signIn('dev', { email: String(form.get('email') ?? ''), redirectTo: '/' });
    } catch (e) {
      if (e instanceof AuthError) redirect('/signin?error=CredentialsSignin');
      throw e;
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-700 to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <p className="text-3xl" aria-hidden>🚀</p>
        <h1 className="mt-2 text-2xl font-bold">DevOps Study Tracker</h1>
        <p className="mt-1 text-sm text-slate-600">Log study, verify each other, review deliverables. Nobody argues with the system.</p>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{MESSAGES[error] ?? 'Sign-in failed. Please try again.'}</p>}

        <form action={github} className="mt-6">
          <button className="btn btn-primary w-full" type="submit">Sign in with GitHub</button>
        </form>
        {googleEnabled && (
          <form action={google} className="mt-2">
            <button className="btn w-full" type="submit">Sign in with Google</button>
          </form>
        )}

        {devLoginEnabled && (
          <form action={dev} className="mt-6 border-t border-dashed border-slate-200 pt-4">
            <label className="label" htmlFor="dev-email">Dev login (local only)</label>
            <div className="flex gap-2">
              <input id="dev-email" name="email" type="email" required className="input" placeholder="invited@email.com" />
              <button className="btn btn-ghost" type="submit">Go</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
