"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Sparkles, Building2, MapPin, X } from "lucide-react";

interface AddCelebrationModalProps {
  isOpen: boolean;
  property?: {
    name: string;
    property_type?: string;
    location_name?: string;
    price_per_night?: number;
    image_url?: string;
  } | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export const AddCelebrationModal: React.FC<AddCelebrationModalProps> = ({
  isOpen,
  property,
  title = "Stay Added Successfully!",
  subtitle = "Your new property has been published and added to the platform.",
  onClose,
  autoCloseMs = 3200,
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate 16 colorful confetti pieces
      const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"];
      const newParticles = Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 260,
        y: -Math.random() * 160 - 20,
        color: colors[i % colors.length],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);

      if (autoCloseMs > 0) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseMs);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-emerald-300 animate-add-bounce relative overflow-hidden text-center">
        
        {/* Background Emerald Glow Circles */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Confetti Explosion Elements */}
        <div className="absolute inset-x-0 top-20 flex justify-center pointer-events-none">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-sm animate-poof"
              style={{
                width: `${p.size}px`,
                height: `${p.size * 0.6}px`,
                backgroundColor: p.color,
                transform: `translate(${p.x}px, ${p.y}px) rotate(${p.id * 25}deg)`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* 3D-styled Animated Icon with Ping Ripple */}
        <div className="relative inline-flex items-center justify-center mb-4 mt-2">
          {/* Glowing Ping Rings */}
          <span className="absolute w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />
          <span className="absolute w-28 h-28 rounded-full bg-emerald-500/10 animate-pulse" />

          {/* Center Badge */}
          <div className="w-18 h-18 p-4 bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white rounded-3xl shadow-xl shadow-emerald-500/30 flex items-center justify-center relative z-10 scale-105 transition-transform">
            <Building2 className="w-10 h-10 drop-shadow" />
          </div>

          <div className="absolute -bottom-1 -right-1 p-1.5 bg-white text-emerald-600 rounded-full shadow-md border border-emerald-200 z-20">
            <CheckCircle className="w-5 h-5 fill-emerald-600 text-white" />
          </div>
        </div>

        {/* Title and Sparkle Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>New Addition Live</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          {subtitle}
        </p>

        {/* Property Preview Card (if property details provided) */}
        {property && (
          <div className="mt-5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-left flex items-center gap-3 shadow-inner">
            {property.image_url ? (
              <img
                src={property.image_url}
                alt=""
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-stone-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-black text-sm">
                STAY
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                {property.property_type || "Villa"}
              </span>
              <h4 className="font-extrabold text-sm text-stone-900 truncate">
                {property.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                {property.location_name && (
                  <span className="text-stone-500 text-[11px] flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    {property.location_name}
                  </span>
                )}
                {property.price_per_night && (
                  <span className="font-black text-stone-900 text-xs">
                    ₹{property.price_per_night} / night
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
          >
            Awesome! View in Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
