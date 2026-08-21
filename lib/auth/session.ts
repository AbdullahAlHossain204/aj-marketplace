import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export interface CurrentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

/**
 * Server-only helper for pages/route handlers. Returns null when there is
 * no session — callers decide whether that means "redirect to /login" (a
 * page) or "401" (an API route). The `role` field here is convenience only
 * (same caveat as auth-options.ts session callback): never use it to gate
 * an action, use lib/auth/rbac.ts for that.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
