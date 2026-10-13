"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Calendar, 
  Users, 
  AlertCircle,
  QrCode
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = Number(params.bookingId);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("traveler@okhdfcbank");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Contact access state for confirmed booking
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  // Load pending booking details
  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true);
        const res = await api.bookings.getDetail(bookingId.toString());
        if (res.success && res.data) {
          setBooking(res.data);
          if (res.data.status === "confirmed") {
            setPaymentSuccess(true);
            setConfirmedBooking(res.data);
          }
        } else {
          setError("Booking not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId]);

  // Fetch verified contact details once booking is confirmed
  useEffect(() => {
    if (paymentSuccess && confirmedBooking) {
      async function fetchContacts() {
        try {
          setLoadingContact(true);
          const res = await api.contacts.getBookingAccess(confirmedBooking.id || bookingId);
          if (res.success && res.data) {
            setContactDetails(res.data);
          }
        } catch (e) {
          console.warn("Could not load contact details:", e);
        } finally {
          setLoadingContact(false);
        }
      }
      fetchContacts();
    }
  }, [paymentSuccess, confirmedBooking, bookingId]);

  const handleContactAction = async (type: "whatsapp" | "call") => {
    try {
      await api.contacts.logAccess({
        booking_id: confirmedBooking?.id || bookingId,
        access_type: type
      });
    } catch (e) {
      console.warn("Failed to log contact access:", e);
    }
  };

  const handlePayNow = async () => {
    try {
      setProcessing(true);
      setError(null);

      // 1. Initiate payment order on server
      const initRes = await api.payments.initiate(bookingId);
      if (!initRes.success || !initRes.data) {
        throw new Error(initRes.message || "Failed to initialize payment gateway order");
      }

      const orderData = initRes.data;
      const paymentId = `pay_sim_${Date.now()}`;

      // 2. Generate verifiable signature for server verification
      const sigRes = await api.payments.getSimulationSignature(orderData.order_id, paymentId);
      const signature = sigRes.signature;

      // 3. CRITICAL: Server-Side Payment Verification
      const verifyRes = await api.payments.verify({
        booking_id: bookingId,
        razorpay_order_id: orderData.order_id,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        payment_method: paymentMethod,
      });

      if (verifyRes.success && verifyRes.data.verified) {
        // Fetch updated booking pass
        const updatedBookingRes = await api.bookings.getDetail(bookingId.toString());
        setConfirmedBooking(updatedBookingRes.data);
        setPaymentSuccess(true);

        // Fire celebratory confetti!
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else {
        throw new Error(verifyRes.message || "Payment signature could not be verified by server");
      }
    } catch (err: any) {
      setError(err.message || "Payment processing failed. Please retry.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-stone-600">Loading secure checkout...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-black text-stone-900">Checkout Error</h2>
        <p className="text-sm text-stone-500">{error}</p>
        <Link href="/bookings" className="inline-block px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm">
          Go to My Bookings
        </Link>
      </div>
    );
  }

  // SUCCESSFUL CONFIRMATION VIEW
  if (paymentSuccess && confirmedBooking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Booking Confirmed & Verified
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900">
            ✓ Booking Confirmed
          </h1>
          <p className="text-sm text-stone-500">
            Your stay reservation is locked in SQLite database with booking reference:
          </p>
          <div className="inline-block px-4 py-2 bg-stone-100 rounded-xl text-lg font-black tracking-wider text-brand-700 font-mono">
            {confirmedBooking.booking_code}
          </div>
        </div>

        {/* QR Code Quick Card */}
        {confirmedBooking.qr_code_data && (
          <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xl max-w-sm mx-auto space-y-4">
            <img
              src={confirmedBooking.qr_code_data}
              alt="Booking QR Pass"
              className="w-48 h-48 mx-auto rounded-2xl border border-stone-200"
            />
            <div className="text-xs text-stone-600">
              <p className="font-bold text-stone-900">{confirmedBooking.property?.name}</p>
              <p>{confirmedBooking.check_in} to {confirmedBooking.check_out} ({confirmedBooking.guest_count} Guests)</p>
            </div>
          </div>
        )}

        {/* CONTROLLED CONTACT SYSTEM - UNLOCKED FOR CONFIRMED BOOKING */}
        <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl border-2 border-emerald-200 text-left max-w-lg mx-auto shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <div>
                <h4 className="font-black text-sm text-stone-900">Direct Host Contact Unlocked</h4>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  Available exclusively for this confirmed reservation
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Paid & Confirmed
            </span>
          </div>

          <div className="text-xs text-stone-700 space-y-1">
            <p><strong>Host:</strong> {contactDetails?.host_name || confirmedBooking.property?.host?.name || "Gujarat Verified Host"}</p>
            {contactDetails?.host_phone && (
              <p><strong>Direct Phone:</strong> <span className="font-mono font-bold text-stone-900">{contactDetails.host_phone}</span></p>
            )}
            <p className="text-[11px] text-stone-500">
              You can now coordinate check-in timing, directions, and special requests directly with your host.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {contactDetails?.whatsapp_url ? (
              <a
                href={contactDetails.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleContactAction("whatsapp")}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
              >
                <span>📱 WhatsApp Host</span>
              </a>
            ) : (
              <button
                disabled
                className="py-3 px-4 rounded-xl bg-stone-200 text-stone-400 font-bold text-xs flex items-center justify-center space-x-2"
              >
                <span>📱 WhatsApp (Loading...)</span>
              </button>
            )}

            {contactDetails?.call_url ? (
              <a
                href={contactDetails.call_url}
                onClick={() => handleContactAction("call")}
                className="py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
              >
                <span>📞 Call Host</span>
              </a>
            ) : (
              <button
                disabled
                className="py-3 px-4 rounded-xl bg-stone-200 text-stone-400 font-bold text-xs flex items-center justify-center space-x-2"
              >
                <span>📞 Call Host</span>
              </button>
            )}
          </div>

          {contactDetails?.prefilled_message && (
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 text-[11px] text-stone-500">
              <span className="font-bold text-stone-700 block mb-0.5">Pre-filled WhatsApp message:</span>
              <p className="italic font-mono text-[10px] text-stone-600 break-words line-clamp-2">
                &ldquo;{contactDetails.prefilled_message}&rdquo;
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href={`/bookings/${confirmedBooking.booking_code}`}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <QrCode className="w-4 h-4" />
            <span>View Full QR Booking Pass</span>
          </Link>

          <Link
            href="/bookings"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold text-sm transition-all"
          >
            My Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Checkout Title */}
      <div className="flex items-center justify-between pb-6 border-b border-stone-200">
        <div>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block mb-1">
            Step 2 of 2: Payment
          </span>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Confirm & Pay Securely
          </h1>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>256-Bit Encrypted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Payment Methods Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-md space-y-6">
            <h3 className="font-extrabold text-lg text-stone-900 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>Select Payment Method (Razorpay Integration)</span>
            </h3>

            {/* Methods options */}
            <div className="space-y-3">
              {/* UPI */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === "upi" ? "border-brand-500 bg-brand-50/50 shadow-sm" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">UPI Instant Payment</h4>
                    <p className="text-xs text-stone-500">Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment_method"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
              </label>

              {paymentMethod === "upi" && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800"
                  />
                  <p className="text-[10px] text-stone-400">Simulation ready: Real Razorpay server signature generated.</p>
                </div>
              )}

              {/* Cards */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === "card" ? "border-brand-500 bg-brand-50/50 shadow-sm" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">Credit / Debit Card</h4>
                    <p className="text-xs text-stone-500">Visa, MasterCard, RuPay</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment_method"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
              </label>

              {/* Netbanking */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === "netbanking" ? "border-brand-500 bg-brand-50/50 shadow-sm" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">Net Banking</h4>
                    <p className="text-xs text-stone-500">HDFC, SBI, ICICI, Kotak, Axis</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment_method"
                  value="netbanking"
                  checked={paymentMethod === "netbanking"}
                  onChange={() => setPaymentMethod("netbanking")}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handlePayNow}
              disabled={processing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-700 hover:to-amber-600 text-white font-extrabold text-base shadow-xl shadow-brand-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {processing ? "Verifying with Razorpay..." : `Pay ₹${booking.total.toLocaleString("en-IN")} Securely`}
              </span>
            </button>
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-md space-y-5">
          <h3 className="font-extrabold text-base text-stone-900 pb-3 border-b border-stone-100">
            Reservation Summary
          </h3>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Stay</p>
              <h4 className="font-bold text-sm text-stone-900">{booking.property?.name || "Gujarat Escape"}</h4>
              <p className="text-xs text-stone-500">{booking.property?.location_name || "Gujarat"}</p>
            </div>

            <div className="flex items-center space-x-4 text-xs text-stone-600 pt-2 border-t border-stone-100">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>{booking.check_in} to {booking.check_out}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-brand-600" />
                <span>{booking.guest_count} Guests</span>
              </div>
            </div>

            {/* Line items */}
            <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">₹{booking.subtotal.toLocaleString("en-IN")}</span>
              </div>

              {booking.cleaning_fee > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Cleaning & Hygiene fee</span>
                  <span className="font-semibold text-stone-900">₹{booking.cleaning_fee.toLocaleString("en-IN")}</span>
                </div>
              )}

              {booking.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span>- ₹{booking.discount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>GST (12%)</span>
                <span className="font-semibold text-stone-900">₹{booking.tax.toLocaleString("en-IN")}</span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-sm text-stone-900">
                <span>Amount Due</span>
                <span className="text-lg text-brand-600">₹{booking.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
