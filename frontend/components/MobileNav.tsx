"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Sparkles, Calendar, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const links = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Planner", href: "/weekend-planner", icon: Sparkles, highlight: true },
    { label: "Bookings", href: isAuthenticated ? "/bookings" : "/auth/login", icon: Calendar },
    { label: "Wishlist", href: isAuthenticated ? "/wishlist" : "/auth/login", icon: Heart },
  ];

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-stone-200/90 px-2 pt-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-90 ${
                link.highlight
                  ? "text-amber-600 font-extrabold"
                  : isActive
                  ? "text-brand-600 font-bold"
                  : "text-stone-500 font-medium hover:text-stone-800"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  link.highlight
                    ? "bg-amber-100/80 text-amber-600"
                    : isActive
                    ? "bg-brand-50 text-brand-600"
                    : "bg-transparent text-stone-500"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive || link.highlight ? "font-bold" : ""}`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
