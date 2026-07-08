import { Link } from "react-router-dom";
import { MapPin, CalendarClock, CreditCard, QrCode } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

const STEPS = [
  { icon: MapPin, title: "Find a location", body: "Search nearby storage by address, or use your current location." },
  { icon: CalendarClock, title: "Pick a time window", body: "Choose your drop-off and pickup time — we check real-time availability." },
  { icon: CreditCard, title: "Pay securely", body: "Pay online through Razorpay. No cash, no surprises." },
  { icon: QrCode, title: "Drop off & collect", body: "Show your QR code at drop-off and again at pickup. That's it." },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="How Luggo works" subtitle="Four steps between you and a hands-free day exploring the city." />
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-xl border border-ink-100 bg-white p-6 shadow-card">
              <span className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <step.icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 rounded-2xl bg-ink-950 px-8 py-10 text-center text-white">
          <h2 className="text-2xl font-bold">Ready to drop your bags?</h2>
          <p className="mt-2 text-ink-300">Find a storage location near you in seconds.</p>
          <Link
            to="/search"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400"
          >
            Find storage
          </Link>
        </div>
      </div>
    </div>
  );
}
