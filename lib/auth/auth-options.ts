import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/utils/password';
import { checkLoginRateLimit } from '@/lib/auth/rate-limit';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // Database-backed sessions (not pure JWT) so admin actions like suspending
  // a seller or user invalidate access immediately rather than waiting for
  // a JWT to expire.
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        // Rate limit before touching the DB to blunt brute-force attempts.
        const allowed = await checkLoginRateLimit(credentials.identifier);
        if (!allowed) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: credentials.identifier }, { phone: credentials.identifier }],
            deletedAt: null,
          },
          include: { role: true },
        });

        if (!user) return null;

        const passwordValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        if (user.status === 'SUSPENDED') {
          throw new Error('This account has been suspended.');
        }

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name,
          role: user.role.name,
        };
      },
    }),
  ],
  callbacks: {
    // Role is attached for UI display/routing convenience only.
    // Authorization-critical checks always re-query the DB via
    // lib/auth/rbac.ts — never trust this value to gate an action.
    async session({ session, user }) {
      if (session.user) {
        (session.user as { id: string; role?: string }).id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { role: true },
        });
        (session.user as { role?: string }).role = dbUser?.role.name;
      }
      return session;
    },
  },
};
