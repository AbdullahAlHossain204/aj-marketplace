'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '') || undefined;
    const phone = String(form.get('phone') || '') || undefined;
    const password = String(form.get('password') || '');
    const name = String(form.get('name') || '');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const json = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(json.error?.message ?? 'Registration failed.');
      return;
    }

    // Auto sign-in right after registration so the person lands in a
    // logged-in state instead of being bounced back to /login.
    const result = await signIn('credentials', {
      identifier: email ?? phone ?? '',
      password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      router.push('/login');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink-700">
          Full name
        </label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-700">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-ink-700">
          Phone
        </label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-700">
          Password
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="mt-1 text-xs text-ink-400">At least 8 characters, with an uppercase letter and a number.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
