"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BookingPassRedirect() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "";

  useEffect(() => {
    if (token) {
      router.replace(`/booking-pass/verify/${encodeURIComponent(token)}`);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
