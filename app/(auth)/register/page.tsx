import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <Link href="/" className="text-lg font-bold text-brand-700">
          AJ Marketplace
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-ink-900">Create your account</h1>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
