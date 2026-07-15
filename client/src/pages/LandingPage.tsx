import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock3,
  MapPinned,
  QrCode,
  Star,
  ChevronDown,
  Building2,
  TrendingUp,
} from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { StorageCard } from "@/components/storage/StorageCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { searchStorage } from "@/api/storage";
import { StorageLocationSummary } from "@/types";

const BENEFITS = [
  { icon: ShieldCheck, title: "Safety first", body: "Every partner location is reviewed and approved before it goes live." },
  { icon: Clock3, title: "Pay by the hour", body: "No flat daily rates — pay only for the hours you actually need." },
  { icon: MapPinned, title: "Real-time availability", body: "See exactly how much space is left before you book, not after." },
  { icon: QrCode, title: "QR check-in", body: "Skip the paperwork. Scan in, scan out, done." },
];

const FAQS = [
  {
    q: "What can I store?",
    a: "Backpacks, suitcases of any size, and most other travel bags. Each location lists exactly which luggage types it accepts and its safety measures.",
  },
  {
    q: "How is pricing calculated?",
    a: "You pay per bag, per hour, rounded up to the next full hour, plus a small platform fee — the full breakdown is shown before you pay.",
  },
  {
    q: "What if a location is full?",
    a: "We only let you book a slot the platform can actually guarantee — availability is checked against real bookings for your exact time window, not just a rough estimate.",
  },
  {
    q: "How do I get my bag back?",
    a: "Show the QR code in your booking at pickup. The partner scans it, confirms it's your booking, and hands your bag over.",
  },
];

export default function LandingPage() {
  const [featured, setFeatured] = useState<StorageLocationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    searchStorage({ sort: "rating" })
      .then(({ results }) => setFeatured(results.slice(0, 4)))
      .catch(() => setError("Couldn't load featured locations right now."));
  }, []);

  const partnerNames = Array.from(new Set((featured ?? []).map((l) => l.partner.businessName))).slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Drop your bags.
            <br />
            Get on with your day.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-600">
            Find safe luggage storage near you, book by the hour, and pick up your bags when you're ready.
          </p>

          <SearchBar className="mx-auto mt-8 max-w-2xl" />

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/search"
              className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Find Storage
            </Link>
            <Link
              to="/become-partner"
              className="rounded-lg border border-ink-200 bg-white px-6 py-3 font-semibold text-ink-800 hover:bg-ink-50"
            >
              Become a Storage Partner
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
              <b.icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold text-ink-900">{b.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular locations */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-900">Popular locations</h2>
              <p className="mt-1 text-ink-500">Top-rated storage spots travelers trust.</p>
            </div>
            <Link to="/search" className="hidden text-sm font-semibold text-brand-700 hover:underline sm:block">
              View all →
            </Link>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!featured && !error && <LoadingSpinner label="Loading locations…" />}
          {featured && featured.length === 0 && (
            <p className="text-sm text-ink-500">No locations are live yet — check back soon.</p>
          )}
          {featured && featured.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((loc) => (
                <StorageCard key={loc.id} location={loc} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured partners */}
      {partnerNames.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-2xl font-bold text-ink-900">Featured storage partners</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {partnerNames.map((name) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-5 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="font-medium text-ink-800">{name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partner acquisition callout */}
      <section className="bg-ink-950 py-20 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:flex-row lg:text-left lg:px-8">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Marketplace
            </span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              Have extra space?
              <br />
              Turn it into income.
            </h2>
            <p className="mt-3 max-w-lg text-ink-300">
              Hotels, hostels, shops, cafes and businesses can earn by providing secure short-term luggage storage.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              to="/become-partner"
              className="inline-block rounded-lg bg-brand-500 px-8 py-4 font-semibold text-white hover:bg-brand-400"
            >
              Become a Storage Partner
            </Link>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-card sm:p-12">
          <ShieldCheck className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-2xl font-bold text-ink-900">Your bags are in safe hands</h2>
          <p className="mt-3 max-w-2xl text-ink-600">
            Every storage partner is reviewed by our team before going live, and every booking is tracked with a
            unique QR code that only your storage location can scan — nobody else can claim your bag with it.
            Partners list their own safety measures (CCTV, staffed hours, lockable storage) on every listing page.
          </p>
        </div>
      </section>

      {/* Reviews (illustrative) */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-ink-900">What travelers say</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { name: "Aditi S.", text: "Booked storage near Connaught Place with an hour to spare before my train. QR check-in took seconds." },
              { name: "Karan V.", text: "Way better than lugging bags around Old Delhi in the heat. Pricing was clear upfront, no surprises." },
            ].map((r) => (
              <div key={r.name} className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-ink-600">"{r.text}"</p>
                <p className="mt-3 text-sm font-semibold text-ink-800">{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold text-ink-900">Frequently asked questions</h2>
        <div className="divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white shadow-card">
          {FAQS.map((faq, i) => (
            <div key={faq.q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-ink-800"
              >
                {faq.q}
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-sm text-ink-500">{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
