"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, MapPin, Heart, ShieldCheck, Users, Bed, Waves, Wifi, Utensils, Flame } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface PropertyProps {
  property: {
    id: number;
    slug: string;
    name: string;
    property_type: string;
    price_per_night: number;
    cleaning_fee: number;
    max_guests: number;
    bedrooms: number;
    bathrooms: number;
    address: string;
    average_rating: number;
    reviews_count: number;
    is_wishlisted?: boolean;
    location?: {
      name: string;
      slug: string;
      district?: string;
    };
    images: Array<{ image_url: string; is_primary?: boolean; is_cover?: boolean; sort_order?: number }>;
    amenities_list?: Array<{ name: string; icon: string }>;
  };
  onWishlistChange?: (propertyId: number, isWishlisted: boolean) => void;
}

export default function PropertyCard({ property, onWishlistChange }: PropertyProps) {
  const { isAuthenticated } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(property.is_wishlisted || false);
  const [toggling, setToggling] = useState(false);

  const coverImage =
    property.images.find((img) => img.is_cover || img.is_primary)?.image_url ||
    property.images[0]?.image_url ||
    "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80";

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      setToggling(true);
      const res = await api.wishlist.toggle(property.id);
      if (res.success && res.data) {
        setIsWishlisted(res.data.is_wishlisted);
        if (onWishlistChange) {
          onWishlistChange(property.id, res.data.is_wishlisted);
        }
      }
    } catch (err) {
      console.error("Wishlist error:", err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Link
      href={`/property/${property.slug || property.id}`}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Property Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={coverImage}
          alt={property.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80";
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Stay</span>
          </div>

          <button
            onClick={handleWishlistToggle}
            disabled={toggling}
            className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-90 ${
              isWishlisted
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                : "bg-white/80 hover:bg-white text-stone-700 hover:text-rose-500"
            }`}
            title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Bottom Image Info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider">
            {property.property_type}
          </span>
          <div className="flex items-center space-x-1 text-xs font-bold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{property.average_rating > 0 ? property.average_rating : 4.9}</span>
            <span className="text-stone-300 font-normal">({property.reviews_count || 12})</span>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-brand-700 mb-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {property.location?.name || "Gujarat"}
              {property.location?.district ? `, ${property.location.district}` : ""}
            </span>
          </div>

          <h3 className="font-bold text-stone-900 text-base line-clamp-1 group-hover:text-brand-600 transition-colors">
            {property.name}
          </h3>

          <div className="flex items-center space-x-3 text-xs text-stone-500 mt-2">
            <span className="flex items-center space-x-1">
              <Users className="w-3.5 h-3.5" />
              <span>Up to {property.max_guests} Guests</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Bed className="w-3.5 h-3.5" />
              <span>{property.bedrooms} Bed{property.bedrooms > 1 ? "s" : ""}</span>
            </span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-extrabold text-stone-900">
                ₹{property.price_per_night.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-stone-500 font-medium">/ night</span>
            </div>
            <span className="text-[10px] text-stone-400 block">+ ₹{property.cleaning_fee} clean & taxes</span>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold group-hover:bg-brand-600 group-hover:text-white transition-colors">
            Reserve
          </span>
        </div>
      </div>
    </Link>
  );
}
