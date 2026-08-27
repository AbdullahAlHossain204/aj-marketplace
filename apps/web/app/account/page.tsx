"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  createdAt: string;
  vendorProfile?: { status: string; businessName: string } | null;
}

export default function AccountPage() {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    authFetch<Profile>("/api/v1/users/me").then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setName(res.data.name);
        setPhone(res.data.phone ?? "");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const res = await authFetch<Profile>("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name, phone: phone || undefined }),
    });
    setIsSaving(false);
    if (res.success && res.data) {
      setProfile(res.data);
      setMessage({ type: "success", text: "Profile updated." });
    } else {
      setMessage({ type: "error", text: res.error?.message ?? "Could not update profile." });
    }
  }

  if (authLoading || !profile) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-gray-500">Loading account...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Account</h1>

      <div className="mb-6 flex gap-4 border-b border-gray-200 text-sm">
        <span className="border-b-2 border-brand-600 pb-2 font-medium text-brand-600">Profile</span>
        <Link href="/account/addresses" className="pb-2 text-gray-600 hover:text-brand-600">
          Addresses
        </Link>
      </div>

      {profile.vendorProfile && (
        <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
          Vendor status: <span className="font-medium">{profile.vendorProfile.status}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            disabled
            value={profile.email}
            className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
          />
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {message && (
          <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </main>
  );
}
