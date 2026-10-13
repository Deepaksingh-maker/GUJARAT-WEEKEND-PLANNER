"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Compass } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import PropertyCard from "@/components/PropertyCard";

export default function WishlistPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      window.location.href = "/auth/login?redirect=/wishlist";
      return;
    }

    if (isAuthenticated) {
      api.wishlist.getAll().then((res) => {
        if (res.success && res.data) {
          setWishlistItems(res.data);
        }
        setLoading(false);
      });
    }
  }, [isAuthenticated, authLoading]);

  const handleWishlistChange = (propId: number, isWishlisted: boolean) => {
    if (!isWishlisted) {
      setWishlistItems((prev) => prev.filter((item) => item.property_id !== propId));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-6 border-b border-stone-200">
        <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block mb-1">
          Saved Escapes
        </span>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">
          Your Gujarat Wishlist
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Properties you have saved for upcoming weekend plans with family and friends.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-600">Loading your saved stays...</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-4">
          <Heart className="w-12 h-12 text-rose-300 mx-auto" />
          <h3 className="text-lg font-bold text-stone-800">Your wishlist is empty</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            Click the heart icon on any stay card while exploring to save it for your next trip.
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-3 rounded-2xl bg-brand-600 text-white font-extrabold text-sm shadow-md"
          >
            Explore Gujarat Stays
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            item.property && (
              <PropertyCard
                key={item.id}
                property={{ ...item.property, is_wishlisted: true }}
                onWishlistChange={handleWishlistChange}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}
