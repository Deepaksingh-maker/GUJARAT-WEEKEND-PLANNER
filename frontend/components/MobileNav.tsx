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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-stone-200 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                link.highlight
                  ? "text-brand-600 font-bold"
                  : isActive
                  ? "text-brand-600 font-bold"
                  : "text-stone-500 font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-lg ${
                  link.highlight
                    ? "bg-amber-100 text-brand-600"
                    : isActive
                    ? "bg-brand-50"
                    : "bg-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
