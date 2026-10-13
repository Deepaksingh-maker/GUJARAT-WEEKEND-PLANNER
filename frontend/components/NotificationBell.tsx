"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Clock, ExternalLink, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.getAll();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (e) {
      // Gracefully silent on background network failure
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s poll
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await api.notifications.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }
    setOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        className="p-2.5 text-stone-600 hover:text-brand-600 hover:bg-stone-100 rounded-xl transition-colors relative"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-extrabold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-stone-200/90 py-3 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-stone-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-stone-500 hover:text-brand-600 flex items-center space-x-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-stone-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 space-y-1">
                <Bell className="w-8 h-8 text-stone-300 mx-auto stroke-1" />
                <p className="font-semibold text-stone-600">All caught up!</p>
                <p>No new notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 hover:bg-stone-50 transition-colors cursor-pointer flex items-start space-x-3 text-left ${
                    !notif.is_read ? "bg-brand-50/30" : ""
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      !notif.is_read ? "bg-brand-600" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-bold text-stone-900 leading-snug">
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-stone-600 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center space-x-2 pt-0.5 text-[10px] text-stone-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {notif.link && (
                        <span className="text-brand-600 font-semibold flex items-center space-x-0.5">
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
