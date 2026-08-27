"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "VENDOR">("CUSTOMER");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const res = await register({
      name,
      email,
      password,
      role,
      ...(role === "VENDOR" ? { businessName } : {}),
    });
    setIsSubmitting(false);
    if (res.ok) router.push("/");
    else setError(res.message ?? "Registration failed");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">Create your AJ Market account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">I want to</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("CUSTOMER")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                role === "CUSTOMER"
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => setRole("VENDOR")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                role === "VENDOR"
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {role === "VENDOR" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
            <input
              type="text"
              required
              minLength={2}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        {role === "VENDOR" && (
          <p className="text-xs text-gray-500">
            Vendor accounts require admin approval before you can list products.
          </p>
        )}
      </form>

      <p className="text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
