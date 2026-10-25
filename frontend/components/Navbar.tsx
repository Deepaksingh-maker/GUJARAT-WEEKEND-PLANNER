"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  Compass, 
  Heart, 
  Calendar, 
  User as UserIcon, 
  Menu, 
  X, 
  Sparkles, 
  MapPin, 
  LogOut, 
  ShieldCheck, 
  Home,
  MessageSquare,
  QrCode
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import MessageNavButton from "@/components/MessageNavButton";

export default function Navbar() {
  const { user, isAuthenticated, isHost, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-2.5 group">
            <img
              src="/logo.png"
              alt="Gujarat Weekend Planner"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 rounded-md hidden lg:inline-block">
              GJ Only
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive("/") ? "bg-stone-100 text-brand-600" : "text-stone-700 hover:text-brand-600 hover:bg-stone-50"
              }`}
            >
              Home
            </Link>
            <Link
              href="/explore"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive("/explore") ? "bg-stone-100 text-brand-600" : "text-stone-700 hover:text-brand-600 hover:bg-stone-50"
              }`}
            >
              Explore Stays
            </Link>
            <Link
              href="/activities"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive("/activities") ? "bg-stone-100 text-brand-600" : "text-stone-700 hover:text-brand-600 hover:bg-stone-50"
              }`}
            >
              Activities
            </Link>
            <Link
              href="/weekend-planner"
              className={`relative px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-1.5 transition-all ${
                isActive("/weekend-planner")
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "text-stone-800 hover:bg-amber-50/70 hover:text-amber-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Weekend Planner</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isHost && !isAdmin && (
              <Link
                href="/host/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center space-x-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Host Dashboard</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center space-x-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </Link>
            )}

            {(isHost || isAdmin) && (
              <Link
                href="/scanner"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors flex items-center space-x-1"
                title="Scan Booking Pass QR"
              >
                <QrCode className="w-3.5 h-3.5 text-stone-600" />
                <span>Pass Scanner ↗</span>
              </Link>
            )}

            {!isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  href="/host/register"
                  className="px-3.5 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Become a Host
                </Link>
                <Link
                  href="/auth/login"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 shadow-md transition-all active:scale-95"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/wishlist"
                  className="p-2.5 text-stone-600 hover:text-brand-600 hover:bg-stone-100 rounded-xl transition-colors relative"
                  title="My Wishlist"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                <Link
                  href="/bookings"
                  className="p-2.5 text-stone-600 hover:text-brand-600 hover:bg-stone-100 rounded-xl transition-colors relative"
                  title="My Bookings"
                >
                  <Calendar className="w-5 h-5" />
                </Link>

                <MessageNavButton />

                <NotificationBell />

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 p-1.5 pl-3 bg-stone-100 hover:bg-stone-200/80 rounded-full transition-colors border border-stone-200"
                  >
                    <span className="text-xs font-bold text-stone-800 max-w-[100px] truncate">
                      {user?.full_name?.split(" ")[0]}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {user?.full_name ? user.full_name[0] : "U"}
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-xs text-stone-400 font-medium">Signed in as</p>
                        <p className="text-sm font-bold text-stone-900 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-700 rounded-full uppercase">
                          {user?.role}
                        </span>
                      </div>

                      <Link
                        href="/messages"
                        className="flex items-center space-x-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <MessageSquare className="w-4 h-4 text-stone-400" />
                        <span>My Messages</span>
                      </Link>

                      <Link
                        href="/bookings"
                        className="flex items-center space-x-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <Calendar className="w-4 h-4 text-stone-400" />
                        <span>My Bookings</span>
                      </Link>

                      <Link
                        href="/wishlist"
                        className="flex items-center space-x-2.5 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <Heart className="w-4 h-4 text-stone-400" />
                        <span>Saved Wishlist</span>
                      </Link>

                      {isHost && !isAdmin && (
                        <Link
                          href="/host/dashboard"
                          className="flex items-center space-x-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          <Home className="w-4 h-4 text-emerald-600" />
                          <span>Host Portal</span>
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center space-x-2.5 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Admin Control Center</span>
                        </Link>
                      )}

                      <div className="border-t border-stone-100 my-1"></div>

                      <button
                        onClick={logout}
                        className="w-full text-left flex items-center space-x-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu trigger button */}
          <div className="md:hidden flex items-center space-x-1">
            <MessageNavButton />
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-base font-semibold text-stone-800 hover:bg-stone-50"
          >
            Home
          </Link>
          <Link
            href="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-base font-semibold text-stone-800 hover:bg-stone-50"
          >
            Explore Stays
          </Link>
          <Link
            href="/activities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-base font-semibold text-stone-800 hover:bg-stone-50"
          >
            Activities & Experiences
          </Link>
          <Link
            href="/weekend-planner"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl text-base font-bold text-amber-600 bg-amber-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Weekend Planner</span>
          </Link>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-stone-200 space-y-2">
              <Link
                href="/messages"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-stone-700 font-medium"
              >
                My Messages
              </Link>
              <Link
                href="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-stone-700 font-medium"
              >
                My Bookings & QR Passes
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-stone-700 font-medium"
              >
                Saved Wishlist
              </Link>
              {isHost && !isAdmin && (
                <Link
                  href="/host/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-emerald-700 font-medium"
                >
                  Host Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-purple-700 font-medium"
                >
                  Admin Portal
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 text-rose-600 font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-stone-200 flex flex-col space-y-2">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center font-bold text-white bg-stone-900 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                href="/host/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center font-bold text-stone-700 bg-stone-100 rounded-xl"
              >
                List Your Gujarat Property
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
