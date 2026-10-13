"use client";

import React from "react";
import Link from "next/link";
import { Clock, Gauge, MapPin, Users, Star, ArrowUpRight } from "lucide-react";

interface ActivityCardProps {
  activity: {
    id: number;
    slug: string;
    name: string;
    description: string;
    category: string;
    price: number;
    duration: string;
    capacity: number;
    difficulty: string;
    image_url?: string;
    average_rating?: number;
    reviews_count?: number;
    slots_count?: number;
    location?: {
      name: string;
      slug: string;
    };
  };
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const imageUrl =
    activity.image_url ||
    "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80";

  return (
    <Link
      href={`/activities/${activity.slug || activity.id}`}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={imageUrl}
          alt={activity.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

        <div className="absolute top-3 left-3 flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full bg-brand-600/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
            {activity.category}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{activity.duration}</span>
            <span>•</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activity.difficulty}</span>
          </div>

          <div className="flex items-center space-x-1 font-bold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{activity.average_rating || 4.9}</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-brand-700 mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{activity.location?.name || "Gujarat"}</span>
          </div>

          <h3 className="font-bold text-stone-900 text-base line-clamp-1 group-hover:text-brand-600 transition-colors">
            {activity.name}
          </h3>

          <p className="text-xs text-stone-500 line-clamp-2 mt-1.5 leading-relaxed">
            {activity.description}
          </p>
        </div>

        <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between">
          <div>
            <span className="text-lg font-extrabold text-stone-900">
              ₹{activity.price.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-stone-500 font-medium"> / person</span>
          </div>

          <span className="p-2 rounded-xl bg-stone-100 text-stone-700 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
