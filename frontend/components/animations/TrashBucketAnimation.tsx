"use client";

import React, { useState, useEffect } from "react";
import { Trash2, AlertTriangle, Check, Sparkles, X } from "lucide-react";

interface TrashBucketDeleteModalProps {
  isOpen: boolean;
  property: {
    id: number;
    name: string;
    price_per_night?: number;
    property_type?: string;
    location?: { name?: string };
    images?: Array<{ image_url: string; is_cover?: boolean; is_primary?: boolean }>;
  } | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const TrashBucketDeleteModal: React.FC<TrashBucketDeleteModalProps> = ({
  isOpen,
  property,
  onClose,
  onConfirm,
}) => {
  // Animation phases:
  // 'idle' -> user sees prompt & ready bucket
  // 'opening' -> lid opens upwards
  // 'dropping' -> item drops into dark bucket mouth
  // 'closing' -> lid snaps shut
  // 'wobble' -> bucket wobbles & poof smoke emerges
  // 'done' -> success check & triggers onConfirm
  const [phase, setPhase] = useState<"idle" | "opening" | "dropping" | "closing" | "wobble" | "done">("idle");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!isOpen || !property) return null;

  const coverImg =
    property.images?.find((img) => img.is_cover || img.is_primary)?.image_url ||
    property.images?.[0]?.image_url ||
    "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80";

  const handleStartDeleteAnimation = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    // Sequence timing:
    // 0ms: Open bucket lid
    setPhase("opening");

    // 280ms: Item starts plunging into the bucket
    setTimeout(() => {
      setPhase("dropping");
    }, 280);

    // 750ms: Item is inside; lid snaps shut firmly
    setTimeout(() => {
      setPhase("closing");
    }, 750);

    // 1050ms: Bucket wobbles and poof dust particles pop out
    setTimeout(() => {
      setPhase("wobble");
    }, 1050);

    // 1450ms: Success state
    setTimeout(async () => {
      setPhase("done");
      try {
        await onConfirm();
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setTimeout(() => {
          onClose();
          setPhase("idle");
          setIsDeleting(false);
        }, 400);
      }
    }, 1450);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200/80 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl shadow-sm">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-stone-900 leading-tight">Delete Property</h3>
              <p className="text-[11px] font-semibold text-rose-600">Send item to trash bucket</p>
            </div>
          </div>

          {phase === "idle" && (
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ANIMATED STAGE AREA */}
        <div className="py-4 flex flex-col items-center justify-center relative min-h-[260px]">
          
          {/* 1. PROPERTY CARD (THE ITEM THAT GOES INTO THE BUCKET) */}
          <div
            className={`w-64 bg-white rounded-2xl p-2.5 border border-stone-200 shadow-md flex items-center gap-3 transition-all ${
              phase === "idle"
                ? "translate-y-0 opacity-100 scale-100"
                : phase === "opening"
                ? "-translate-y-2 scale-95 opacity-100 shadow-lg ring-2 ring-rose-400"
                : phase === "dropping"
                ? "animate-item-drop pointer-events-none"
                : "opacity-0 scale-0 pointer-events-none"
            }`}
            style={{
              zIndex: phase === "dropping" ? 15 : 25,
            }}
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
              <img
                src={coverImg}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-xs text-stone-900 truncate">{property.name}</h4>
              <p className="text-[10px] text-stone-500 truncate">{property.location?.name || "Gujarat"}</p>
              {property.price_per_night && (
                <span className="text-[10px] font-black text-rose-600 block mt-0.5">
                  ₹{property.price_per_night} / night
                </span>
              )}
            </div>
          </div>

          {/* 2. THE ANIMATED TRASH BUCKET (DUSTBIN WITH OPENING LID) */}
          <div className="relative mt-4 flex flex-col items-center justify-center">
            
            {/* Poof Dust Smoke Emitters (Shown when lid snaps shut & bucket wobbles) */}
            {(phase === "wobble" || phase === "done") && (
              <>
                <div className="absolute -top-3 -left-4 w-6 h-6 bg-stone-300 rounded-full animate-poof opacity-70 blur-[1px]" />
                <div className="absolute -top-5 left-10 w-7 h-7 bg-stone-400 rounded-full animate-poof opacity-80 blur-[1px] delay-75" />
                <div className="absolute -top-3 -right-4 w-5 h-5 bg-stone-300 rounded-full animate-poof opacity-70 blur-[1px] delay-100" />
                <div className="absolute -top-8 text-amber-500 animate-bounce">
                  <Sparkles className="w-5 h-5" />
                </div>
              </>
            )}

            {/* SVG TRASH BUCKET */}
            <div
              className={`w-36 h-40 relative flex items-center justify-center ${
                phase === "wobble" ? "animate-bin-wobble" : ""
              }`}
            >
              <svg
                viewBox="0 0 160 170"
                className="w-full h-full overflow-visible drop-shadow-xl"
              >
                <defs>
                  {/* Bucket Body Gradient */}
                  <linearGradient id="bucketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="45%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#9f1239" />
                  </linearGradient>

                  {/* Lid Gradient */}
                  <linearGradient id="lidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#be123c" />
                  </linearGradient>

                  {/* Inside Dark Cavity Gradient (Where item disappears) */}
                  <radialGradient id="insideBinGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="80%" stopColor="#020617" />
                    <stop offset="100%" stopColor="#000000" />
                  </radialGradient>
                </defs>

                {/* 1. DARK CAVITY INSIDE MOUTH (Visible when lid opens) */}
                <ellipse
                  cx="80"
                  cy="50"
                  rx="48"
                  ry="12"
                  fill="url(#insideBinGrad)"
                  stroke="#475569"
                  strokeWidth="2"
                />

                {/* 2. BUCKET BODY (Tapered Cylinder) */}
                <path
                  d="M 34 50 L 44 148 C 45 154 50 158 56 158 L 104 158 C 110 158 115 154 116 148 L 126 50 Z"
                  fill="url(#bucketGrad)"
                  stroke="#881337"
                  strokeWidth="2"
                />

                {/* Vertical Rib Lines on Bucket */}
                <line x1="62" y1="58" x2="68" y2="150" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
                <line x1="80" y1="58" x2="80" y2="150" stroke="#fda4af" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                <line x1="98" y1="58" x2="92" y2="150" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />

                {/* Front Emblem: Minimalist Recycle/Trash symbol */}
                <circle cx="80" cy="102" r="16" fill="#881337" opacity="0.35" />
                <path
                  d="M 74 98 L 80 94 L 86 98 M 80 95 L 80 110 M 74 105 L 86 105"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />

                {/* Bottom Base Rim */}
                <path
                  d="M 46 152 L 114 152 C 116 152 118 155 116 158 L 112 162 C 111 163 109 164 107 164 L 53 164 C 51 164 49 163 48 162 L 44 158 C 42 155 44 152 46 152 Z"
                  fill="#4c0519"
                />

                {/* 3. DUSTBIN LID (DHAKKAN) - Hinged on Left (x: 28, y: 48) */}
                <g
                  className={`${
                    phase === "opening" || phase === "dropping"
                      ? "animate-bin-lid-open"
                      : phase === "closing" || phase === "wobble" || phase === "done"
                      ? "animate-bin-lid-close"
                      : "transition-transform duration-300"
                  }`}
                  style={{
                    transformOrigin: "28px 48px",
                  }}
                >
                  {/* Lid Top Handle */}
                  <path
                    d="M 68 36 C 68 30 92 30 92 36"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Lid Dome / Cap */}
                  <path
                    d="M 26 48 C 26 38 48 34 80 34 C 112 34 134 38 134 48 Z"
                    fill="url(#lidGrad)"
                    stroke="#be123c"
                    strokeWidth="2"
                  />

                  {/* Lid Extended Lip / Rim */}
                  <rect
                    x="22"
                    y="46"
                    width="116"
                    height="8"
                    rx="4"
                    fill="#be123c"
                    stroke="#881337"
                    strokeWidth="1.5"
                  />
                  {/* Subtle Lid Highlight */}
                  <ellipse cx="80" cy="40" rx="40" ry="3" fill="#ffffff" opacity="0.3" />
                </g>
              </svg>
            </div>

            {/* State Label */}
            <div className="mt-3 text-center">
              {phase === "idle" && (
                <span className="text-xs font-bold text-stone-500">
                  Ready to toss into trash bucket
                </span>
              )}
              {(phase === "opening" || phase === "dropping") && (
                <span className="text-xs font-extrabold text-rose-600 flex items-center justify-center gap-1.5 animate-pulse">
                  <span>Dhakkan khul raha hai... bucket me jaa raha hai!</span>
                </span>
              )}
              {phase === "closing" && (
                <span className="text-xs font-extrabold text-rose-700">
                  Dhakkan band ho raha hai...
                </span>
              )}
              {(phase === "wobble" || phase === "done") && (
                <span className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 animate-in zoom-in-50">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Successfully Deleted & Trashed!</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Warning Text */}
        {phase === "idle" && (
          <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-100 text-xs text-stone-700 flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              This property will be permanently removed along with its photos, bookings history, and availability calendar.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartDeleteAnimation}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Trashing Item...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Throw in Bucket</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
