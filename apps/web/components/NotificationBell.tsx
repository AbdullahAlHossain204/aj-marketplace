"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { Notification } from "../lib/types";

/**
 * Header bell + dropdown, not a dedicated notifications page — a handful
 * of recent items with mark-read affordances is enough content for this
 * phase (see Phase 12's completion report for the reasoning). If usage
 * shows people wanting to browse further back than the dropdown holds,
 * a full /notifications page reusing this same GET /api/v1/notifications
 * endpoint (it already paginates) is a small addition later.
 */
export function NotificationBell() {
  const { user, isLoading, authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refreshUnreadCount() {
    const res = await authFetch<{ count: number }>("/api/v1/notifications/unread-count");
    if (res.success && res.data) setUnreadCount(res.data.count);
  }

  // Poll the cheap unread-count endpoint rather than the full list, so the
  // badge stays roughly current without the cost of re-fetching and
  // re-counting the whole list every time (see the phase prompt's note on
  // unread-count being a deliberately cheap, separate endpoint).
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Close on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    const res = await authFetch<Notification[]>("/api/v1/notifications?limit=10");
    if (res.success && res.data) {
      setNotifications(res.data);
      setHasLoaded(true);
    }
  }

  function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !hasLoaded) loadNotifications();
  }

  async function handleMarkAsRead(notification: Notification) {
    if (notification.isRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await authFetch(`/api/v1/notifications/${notification.id}/read`, { method: "PATCH" });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await authFetch("/api/v1/notifications/read-all", { method: "PATCH" });
  }

  if (isLoading || !user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-gray-700 hover:bg-gray-100 hover:text-brand-600"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!hasLoaded && <p className="px-3 py-6 text-center text-sm text-gray-500">Loading…</p>}

            {hasLoaded && notifications.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-500">No notifications yet.</p>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                className={`block w-full border-b border-gray-50 px-3 py-2.5 text-left last:border-b-0 hover:bg-gray-50 ${
                  notification.isRead ? "" : "bg-brand-50/40"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notification.isRead && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-600" />}
                  <div className={notification.isRead ? "ml-3.5" : ""}>
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-gray-600">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{formatRelativeTime(notification.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
