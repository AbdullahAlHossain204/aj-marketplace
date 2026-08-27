"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../lib/AuthContext";

const navItems = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/store", label: "Store Settings" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/orders", label: "Orders" },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "VENDOR") {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "VENDOR") {
    return <main className="mx-auto max-w-7xl px-4 py-8 text-gray-500">Loading...</main>;
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <aside className="w-48 flex-shrink-0">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname === item.href ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
