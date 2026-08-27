const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
  meta?: { pagination?: { page: number; limit: number; total: number; totalPages: number } };
}

/**
 * Thin fetch wrapper. Every backend response follows the same
 * { success, data, error } envelope, so callers get consistent typing
 * instead of unwrapping raw fetch responses everywhere.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = (await res.json()) as ApiResponse<T>;
  return json;
}
