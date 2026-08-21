import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <Link href="/" className="text-lg font-bold text-brand-700">
          AJ Marketplace
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-ink-900">Sign in to your account</h1>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-ink-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
