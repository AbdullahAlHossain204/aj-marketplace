"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminUser } from "../../../lib/types";

export default function AdminUsersPage() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await authFetch<AdminUser[]>("/api/v1/admin/users?limit=50");
    if (res.success && res.data) setUsers(res.data);
    else setError(res.error?.message ?? "Could not load users");
  }

  async function toggleActive(u: AdminUser) {
    if (u.role === "ADMIN") return;
    const label = u.isActive ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${label} ${u.name}?`)) return;
    await authFetch(`/api/v1/admin/users/${u.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      {error && <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{error}</div>}

      {users && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {u.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "ADMIN" && (
                      <button onClick={() => toggleActive(u)} className="text-brand-600 hover:underline">
                        {u.isActive ? "Suspend" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
