"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  QrCode,
  Camera,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Compass,
  Check,
  Copy
} from "lucide-react";

import { parseBookingQR } from "@/lib/qr-parser";

export default function QRScannerPage() {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "manual">(
    "camera"
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<{
    reference: string;
    url: string;
    openedInNewTab: boolean;
    timestamp: string;
  } | null>(null);
  const [scanHistory, setScanHistory] = useState<
    Array<{ reference: string; url: string; time: string }>
  >([]);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] =
    useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lockoutUntilRef = useRef<number>(0);

  // Check BarcodeDetector support
  useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      setBarcodeDetectorSupported(true);
    }
  }, []);

  // Cleanup camera stream
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle a successfully parsed QR code
  const handleScanSuccess = (rawText: string) => {
    const now = Date.now();
    const parsed = parseBookingQR(rawText);

    if (!parsed.isValid) {
      return;
    }

    // Debounce to prevent duplicate tabs when camera sees same QR repeatedly
    if (
      lastScannedRef.current === parsed.tokenOrCode &&
      now < lockoutUntilRef.current
    ) {
      return;
    }

    // Set lockout for 4 seconds
    lastScannedRef.current = parsed.tokenOrCode;
    lockoutUntilRef.current = now + 4000;

    // Automatically attempt opening in a new tab
    let openedInNewTab = false;
    try {
      const newTab = window.open(parsed.url, "_blank");
      if (newTab && !newTab.closed && typeof newTab.closed !== "undefined") {
        openedInNewTab = true;
      }
    } catch {
      openedInNewTab = false;
    }

    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const result = {
      reference: parsed.displayReference,
      url: parsed.url,
      openedInNewTab,
      timestamp: timeStr
    };

    setScanResult(result);
    setScanHistory((prev) => [
      { reference: parsed.displayReference, url: parsed.url, time: timeStr },
      ...prev.slice(0, 4)
    ]);
  };

  // Start Camera
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);

        // Start continuous detection if BarcodeDetector is available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code"]
          });

          const scanLoop = async () => {
            if (
              videoRef.current &&
              videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
            ) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  handleScanSuccess(rawValue);
                }
              } catch {
                // Ignore detection frame errors
              }
            }
            animFrameRef.current = requestAnimationFrame(scanLoop);
          };

          animFrameRef.current = requestAnimationFrame(scanLoop);
        }
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setCameraError(
        err.message ||
          "Could not access camera. Please allow camera permissions or upload an image."
      );
      setCameraActive(false);
    }
  };

  // Handle Image File Upload Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!("BarcodeDetector" in window)) {
      alert(
        "BarcodeDetector is not supported in this browser. Please use the Manual Code Entry tab or modern Chrome/Edge/Safari."
      );
      return;
    }

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();

      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code"]
      });
      const barcodes = await detector.detect(img);

      if (barcodes.length > 0) {
        handleScanSuccess(barcodes[0].rawValue);
      } else {
        alert("No valid QR code was detected in this image. Please try another photo.");
      }
    } catch (err: any) {
      alert("Error scanning image file: " + (err.message || "Failed to parse image"));
    }
  };

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode("");
  };

  return (
    <div className="min-h-screen bg-stone-100/70 py-8 sm:py-12 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-700 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Compass className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-brand-600 block">
            Gujarat Weekend Escapes
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Booking Pass Scanner
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            Scan guest booking passes at check-in. Validates reservations in
            real-time and displays the Digital Booking Pass in a new tab.
          </p>
        </div>

        {/* SCANNER TABS */}
        <div className="bg-white rounded-3xl p-1.5 border border-stone-200 shadow-sm flex items-center">
          <button
            onClick={() => {
              setActiveTab("camera");
              startCamera();
            }}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "camera"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveTab("upload");
            }}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "upload"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveTab("manual");
            }}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "manual"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Code / Token</span>
          </button>
        </div>

        {/* ACTIVE TAB CONTENT */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6">
          {/* CAMERA TAB */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-video max-w-md mx-auto bg-stone-900 rounded-2xl overflow-hidden border-2 border-stone-800 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${
                    cameraActive ? "block" : "hidden"
                  }`}
                />

                {/* Reticle / Viewfinder Overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-brand-400/80 rounded-2xl relative shadow-lg">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-brand-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-brand-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-brand-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-brand-400" />
                      {/* Laser scanning line */}
                      <div className="w-full h-0.5 bg-brand-400/80 animate-pulse absolute top-1/2 -translate-y-1/2 shadow-sm" />
                    </div>
                  </div>
                )}

                {!cameraActive && (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-10 h-10 text-stone-500 mx-auto" />
                    <p className="text-xs text-stone-400 max-w-xs">
                      {cameraError ||
                        "Camera is paused. Click below to start live QR scanning."}
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors shadow-sm inline-flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
                  >
                    Pause Camera
                  </button>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* IMAGE UPLOAD TAB */}
          {activeTab === "upload" && (
            <div className="p-8 border-2 border-dashed border-stone-300 rounded-3xl text-center space-y-4 hover:border-brand-500 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-100">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-sm">
                  Upload Pass QR Code Image
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Take a photo of the guest's mobile pass or upload a saved screenshot.
                </p>
              </div>
              <label className="inline-block px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs cursor-pointer transition-colors shadow-sm">
                <span>Select Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* MANUAL ENTRY TAB */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Booking Reference or Token
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. GUJ-WKD-00MBA or gwk_..."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Verify & Open Booking Pass</span>
              </button>
            </form>
          )}

          {/* LATEST SCAN RESULT BANNER */}
          {scanResult && (
            <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-2xl border-2 border-emerald-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider">
                      QR Code Validated
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-800 font-bold block">
                      Ref: {scanResult.reference}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-stone-400 font-bold">
                  {scanResult.timestamp}
                </span>
              </div>

              {scanResult.openedInNewTab ? (
                <p className="text-xs text-emerald-800 font-medium">
                  ✓ Digital Booking Pass automatically opened in a new browser tab.
                </p>
              ) : (
                <p className="text-xs text-amber-800 font-medium">
                  Automatic new tab was blocked by your browser. Click the button below to view the pass:
                </p>
              )}

              {/* ACTION BUTTON (Opens in New Tab) */}
              <div className="pt-1">
                <a
                  href={scanResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs transition-colors shadow-md"
                >
                  <span>Open Booking Pass (New Tab)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* RECENT SCANS LIST */}
          {scanHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Recent Scans
              </span>
              <div className="divide-y divide-stone-100">
                {scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-mono font-bold text-stone-800">
                        {item.reference}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        ({item.time})
                      </span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 font-bold text-xs flex items-center space-x-1"
                    >
                      <span>Open Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
