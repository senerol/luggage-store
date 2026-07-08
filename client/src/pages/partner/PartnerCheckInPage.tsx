import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Camera, CheckCircle2, ScanLine } from "lucide-react";
import { verifyQr } from "@/api/qr";
import { Booking } from "@/types";
import { extractErrorMessage } from "@/api/client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, luggageLabel } from "@/utils/format";

// Camera-based scanning uses the native BarcodeDetector API where the
// browser supports it (Chrome/Edge on desktop and Android as of this
// writing). Where it isn't available, manual token entry - always present
// below - is the reliable fallback rather than pretending to decode a QR
// image without the capability to actually do so.
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export default function PartnerCheckInPage() {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Booking | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraSupported = typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices;

  async function processToken(value: string) {
    if (!value.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const booking = await verifyQr(value.trim());
      setResult(booking);
      toast.success("Booking updated.");
      setToken("");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function startScanning() {
    if (!cameraSupported || !window.BarcodeDetector) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch {
      toast.error("Couldn't access the camera. Use manual entry instead.");
    }
  }

  function stopScanning() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    if (!scanning || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          stopScanning();
          processToken(codes[0].rawValue);
        }
      } catch {
        // ignore transient detection errors
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [scanning]);

  useEffect(() => () => stopScanning(), []);

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Check-in / check-out</h1>
      <p className="mb-6 text-ink-500">Scan or enter a customer's booking QR token to check bags in or out.</p>

      {cameraSupported && (
        <div className="mb-6 rounded-xl border border-ink-100 bg-white p-4 shadow-card">
          {!scanning ? (
            <button
              onClick={startScanning}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 py-3 font-medium text-ink-700 hover:bg-ink-50"
            >
              <Camera className="h-4 w-4" /> Scan with camera
            </button>
          ) : (
            <div>
              <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline />
              <button onClick={stopScanning} className="mt-2 w-full rounded-lg border border-ink-200 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">
                Stop scanning
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
        <label className="text-sm font-medium text-ink-700">Booking QR token</label>
        <div className="mt-1 flex gap-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && processToken(token)}
            placeholder="Paste or type the scanned token"
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
          <button
            onClick={() => processToken(token)}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <ScanLine className="h-4 w-4" /> {submitting ? "Verifying…" : "Verify"}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
          <div className="flex items-center gap-2 text-brand-800">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold">Booking {result.bookingCode}</p>
          </div>
          <div className="mt-2">
            <StatusBadge status={result.status} />
          </div>
          <p className="mt-2 text-sm text-ink-600">
            {result.items.map((i) => `${i.quantity} × ${luggageLabel(i.luggageType)}`).join(", ")}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {formatDateTime(result.dropoffAt)} → {formatDateTime(result.pickupAt)}
          </p>
        </div>
      )}
    </div>
  );
}
