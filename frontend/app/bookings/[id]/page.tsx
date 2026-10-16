"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  QrCode, 
  MapPin, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  Star, 
  AlertCircle, 
  Home,
  MessageSquare,
  Lock,
  Phone,
  ExternalLink
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function BookingPassPage() {
  const params = useParams();
  const { user } = useAuth();
  const idOrCode = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controlled contact details
  const [contactAccess, setContactAccess] = useState<any>(null);

  // Review submission state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadBookingPass() {
      try {
        setLoading(true);
        const res = await api.bookings.getDetail(idOrCode);
        if (res.success && res.data) {
          setBooking(res.data);
          // If confirmed and paid, fetch controlled contact access
          if (res.data.status === "confirmed" && res.data.payment_status === "paid") {
            try {
              const contactRes = await api.contacts.getBookingAccess(res.data.id);
              if (contactRes.success && contactRes.data) {
                setContactAccess(contactRes.data);
              }
            } catch (err) {
              console.warn("Could not load contact access:", err);
            }
          }
        } else {
          setError("Booking pass not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load booking pass");
      } finally {
        setLoading(false);
      }
    }
    loadBookingPass();
  }, [idOrCode]);

  const handleLogContact = async (type: "whatsapp" | "call") => {
    if (!booking) return;
    try {
      await api.contacts.logAccess({
        booking_id: booking.id,
        access_type: type
      });
    } catch (err) {
      console.warn("Log contact access error:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment || reviewComment.length < 10) {
      setReviewError("Please write at least 10 characters in your review.");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError(null);

      const res = await api.reviews.create({
        booking_id: booking.id,
        property_id: booking.property_id,
        rating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
      });

      if (res.success) {
        setReviewSubmitted(true);
        setShowReviewModal(false);
      }
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason || cancelReason.length < 5) {
      alert("Please provide a reason for cancellation (at least 5 characters).");
      return;
    }

    try {
      setCancelling(true);
      const res = await api.bookings.cancel(booking.id, cancelReason);
      if (res.success && res.data) {
        setBooking(res.data);
        setShowCancelModal(false);
        alert("Booking has been cancelled.");
      }
    } catch (err: any) {
      alert(err.message || "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-stone-600">Verifying digital pass with database...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-black text-stone-900">Pass Not Found</h2>
        <p className="text-sm text-stone-500">{error || "Could not retrieve booking pass."}</p>
        <Link href="/bookings" className="inline-block px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm">
          Return to Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Top Action Header (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/bookings" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1">
          <span>← Back to My Bookings</span>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass / PDF</span>
          </button>
        </div>
      </div>

      {/* DIGITAL BOARDING PASS CARD */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden print:border-none print:shadow-none">
        {/* Pass Header Banner */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 sm:p-8 text-white relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                Official Check-In Document
              </span>
              <h1 className="text-2xl font-black tracking-tight">Gujarat Weekend Pass</h1>
              <p className="text-xs text-stone-300">Verified Reservation Pass</p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {booking.status}
              </span>
            </div>
          </div>
        </div>

        {/* Pass Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Reference and Customer Details */}
          <div className="grid grid-cols-2 gap-4 pb-6 border-b border-stone-100">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Booking Code</span>
              <p className="text-xl font-black text-brand-600 font-mono tracking-wider">{booking.booking_code}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Primary Guest</span>
              <p className="text-base font-extrabold text-stone-900">{booking.customer?.full_name || "Valued Guest"}</p>
              <p className="text-xs text-stone-500">{booking.customer?.email}</p>
            </div>
          </div>

          {/* Stay & Dates */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Property & Location</span>
              <h3 className="text-lg font-black text-stone-900">{booking.property?.name || "Gujarat Escape"}</h3>
              <p className="text-xs text-stone-500 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>{booking.property?.address || "Gujarat, India"}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase block">Check-in</span>
                <span className="font-extrabold text-stone-900">{booking.check_in}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase block">Check-out</span>
                <span className="font-extrabold text-stone-900">{booking.check_out}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase block">Guests</span>
                <span className="font-extrabold text-stone-900">{booking.guest_count} Person{booking.guest_count > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* SCANNABLE QR CODE SECTION */}
          <div className="p-6 bg-stone-50 rounded-3xl border border-dashed border-stone-300 text-center space-y-3">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
              Scan at Property Gate / Host Verification
            </span>

            {booking.qr_code_data ? (
              <img
                src={booking.qr_code_data}
                alt="QR Booking Pass"
                className="w-48 h-48 mx-auto rounded-2xl shadow-sm border border-stone-200 bg-white p-2"
              />
            ) : (
              <div className="w-48 h-48 mx-auto bg-stone-200 rounded-2xl flex items-center justify-center text-xs text-stone-500">
                Generating QR...
              </div>
            )}

            <p className="text-[11px] font-mono text-stone-500 font-bold">
              ID: {booking.booking_code} • Total Paid: ₹{booking.total.toLocaleString("en-IN")}
            </p>

            <div className="pt-2">
              <Link
                href={`/booking-pass/verify/${booking.verification_token || booking.booking_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <span>View Digital Booking Pass</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* CONTROLLED CONTACT SYSTEM */}
          {booking.status === "confirmed" && booking.payment_status === "paid" ? (
            <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-2xl border-2 border-emerald-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider">
                      ✓ Booking Confirmed — Host Contact Unlocked
                    </h4>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Direct WhatsApp & phone coordination enabled for this reservation
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                  Confirmed
                </span>
              </div>

              <div className="text-xs text-stone-700 space-y-1">
                <p><strong>Host:</strong> {contactAccess?.host_name || booking.property?.host?.name || "Gujarat Verified Host"}</p>
                {(contactAccess?.host_phone || booking.property?.host?.phone) && (
                  <p><strong>Phone:</strong> <span className="font-mono font-bold text-stone-900">{contactAccess?.host_phone || booking.property?.host?.phone}</span></p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1 print:hidden">
                {(contactAccess?.whatsapp_url || booking.whatsapp_url) && (
                  <a
                    href={contactAccess?.whatsapp_url || booking.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleLogContact("whatsapp")}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                  >
                    <span>📱 WhatsApp Host</span>
                  </a>
                )}

                {(contactAccess?.call_url || booking.call_url || contactAccess?.host_phone || booking.property?.host?.phone) && (
                  <a
                    href={contactAccess?.call_url || booking.call_url || `tel:${contactAccess?.host_phone || booking.property?.host?.phone}`}
                    onClick={() => handleLogContact("call")}
                    className="py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>📞 Call Host</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center space-x-2 text-stone-800 font-extrabold text-xs">
                <Lock className="w-4 h-4 text-stone-500" />
                <span>🔒 Contact available after booking</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Direct WhatsApp and host phone numbers are protected and unlock automatically once this reservation is confirmed and payment is verified.
              </p>
              <div className="flex items-center space-x-2 text-xs text-stone-400 font-mono">
                <span>Protected Phone:</span>
                <span className="tracking-widest font-bold">+91 ••••• •••••</span>
              </div>
            </div>
          )}

          {/* Included Items */}
          {booking.items && booking.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Itinerary Breakdown
              </span>
              <div className="space-y-1.5 text-xs text-stone-600">
                {booking.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="font-medium">
                      {item.item_type === "property_stay" ? "Stay Reservation" : "Activity Slot"} ({item.quantity} qty)
                    </span>
                    <span className="font-bold text-stone-900">₹{item.total_price.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation Policy Note */}
          <div className="text-[11px] text-stone-500 flex items-center justify-between pt-2">
            <span>Payment Status: <strong className="text-emerald-700 uppercase">{booking.payment_status}</strong></span>
            <span>Security: PRAGMA Foreign Keys SQLite</span>
          </div>
        </div>
      </div>

      {/* Review & Cancellation Actions (hidden in print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        {booking.can_review && !reviewSubmitted && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Star className="w-4 h-4 fill-stone-900 text-stone-900" />
            <span>Leave a Verified Stay Review</span>
          </button>
        )}

        {reviewSubmitted && (
          <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Thank you for your review!</span>
          </span>
        )}

        {booking.status === "confirmed" && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-xs font-bold text-stone-400 hover:text-rose-600 transition-colors ml-auto"
          >
            Cancel this Reservation
          </button>
        )}
      </div>

      {/* REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-xl text-stone-900">Rate Your Gujarat Stay</h3>
                <p className="text-xs text-stone-500 mt-0.5">{booking.property?.name}</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase block mb-1">Your Rating</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 uppercase block mb-1">Review Title</label>
                <input
                  type="text"
                  placeholder="e.g. Unforgettable family weekend!"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 uppercase block mb-1">Detailed Review</label>
                <textarea
                  rows={4}
                  placeholder="Tell other Gujarat travelers about the views, food, pool hygiene, and host hospitality..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              {reviewError && (
                <p className="text-xs text-rose-600 font-semibold">{reviewError}</p>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-stone-900">Cancel Reservation</h3>
            <p className="text-xs text-stone-500">
              Are you sure you want to cancel booking <strong>{booking.booking_code}</strong>? Applicable cancellation policies apply.
            </p>
            <textarea
              rows={3}
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
