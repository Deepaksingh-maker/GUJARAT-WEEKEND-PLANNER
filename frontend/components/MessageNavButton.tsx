"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function MessageNavButton() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.messages.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Background poll failure handled silently
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Link
      href="/messages"
      className="p-2.5 text-stone-600 hover:text-brand-600 hover:bg-stone-100 rounded-xl transition-colors relative"
      title="Host Messages & Inquiries"
      aria-label="Messages"
    >
      <MessageSquare className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[10px] font-extrabold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
