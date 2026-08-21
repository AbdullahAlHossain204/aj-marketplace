'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const result = await signIn('credentials', {
      identifier: String(form.get('identifier') || ''),
      password: String(form.get('password') || ''),
      redirect: false,
    });

    setSubmitting(false);
    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Invalid email/phone or password.' : result.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-ink-700">
          Email or phone
        </label>
        <Input id="identifier" name="identifier" autoComplete="username" required />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-700">
          Password
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
