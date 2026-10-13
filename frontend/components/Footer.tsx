import React from "react";
import Link from "next/link";
import { Compass, ShieldCheck, MapPin, Heart, Sparkles, PhoneCall } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-stone-800">
          {/* Brand Intro */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white">
                Gujarat<span className="text-brand-500">Weekend</span>
              </span>
            </Link>
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed">
              Gujarat’s premier verified weekend stays, private pool villas, heritage retreats, and nature experiences marketplace. Handcrafted for unforgettable 2-day escapes.
            </p>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 w-fit px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Host Verified Gujarat Inventory</span>
            </div>
          </div>

          {/* Popular Destinations */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Destinations</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/explore?location=saputara" className="hover:text-brand-400 transition-colors">
                  Saputara Hill Station
                </Link>
              </li>
              <li>
                <Link href="/explore?location=polo-forest" className="hover:text-brand-400 transition-colors">
                  Polo Forest Vijaynagar
                </Link>
              </li>
              <li>
                <Link href="/explore?location=sasan-gir" className="hover:text-brand-400 transition-colors">
                  Sasan Gir Wildlife
                </Link>
              </li>
              <li>
                <Link href="/explore?location=ekta-nagar" className="hover:text-brand-400 transition-colors">
                  Kevadia / Ekta Nagar
                </Link>
              </li>
              <li>
                <Link href="/explore?location=kutch" className="hover:text-brand-400 transition-colors">
                  White Rann of Kutch
                </Link>
              </li>
              <li>
                <Link href="/explore?location=ahmedabad" className="hover:text-brand-400 transition-colors">
                  Sanand & Ahmedabad
                </Link>
              </li>
            </ul>
          </div>

          {/* Property Types */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Stay Categories</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/explore?property_type=villa" className="hover:text-brand-400 transition-colors">
                  Private Pool Villas
                </Link>
              </li>
              <li>
                <Link href="/explore?property_type=resort" className="hover:text-brand-400 transition-colors">
                  Riverside Resorts
                </Link>
              </li>
              <li>
                <Link href="/explore?property_type=farmhouse" className="hover:text-brand-400 transition-colors">
                  Orchard Farmhouses
                </Link>
              </li>
              <li>
                <Link href="/explore?property_type=camping" className="hover:text-brand-400 transition-colors">
                  Desert & Forest Camps
                </Link>
              </li>
              <li>
                <Link href="/weekend-planner" className="hover:text-brand-400 transition-colors flex items-center space-x-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Weekend Planner</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Host & Help */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Host With Us</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/host/register" className="hover:text-brand-400 transition-colors">
                  List Your Gujarat Property
                </Link>
              </li>
              <li>
                <Link href="/host/dashboard" className="hover:text-brand-400 transition-colors">
                  Host Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-brand-400 transition-colors text-stone-500">
                  Admin Portal
                </Link>
              </li>
              <li className="pt-2">
                <span className="text-xs text-stone-400 block mb-1">Gujarat Traveler Support</span>
                <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-brand-400" />
                  <span>+91 98250 00000</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-stone-500">
          <p>© {new Date().getFullYear()} GujaratWeekend. Built specifically for Gujarat weekend escapes.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span>Non-Global • Local-First Experience</span>
            <span>Real SQLite Database Driven</span>
            <span>Safe & Verified Stays</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
