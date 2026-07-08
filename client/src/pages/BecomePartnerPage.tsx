import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ListChecks,
  ShieldCheck,
  Bell,
  Wallet,
  ChevronDown,
  Hotel,
  Coffee,
  Store,
  Package,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EarningsCalculator } from "@/components/partner/EarningsCalculator";
import { logEvent } from "@/api/analytics";

const STEPS = [
  { icon: ListChecks, title: "List your space", body: "Tell us about your business and the space you have available." },
  { icon: ShieldCheck, title: "Get verified", body: "Our team reviews your application and storage details before you go live." },
  { icon: Bell, title: "Receive bookings", body: "Travelers nearby find and book your space directly through Luggo." },
  { icon: Wallet, title: "Earn money", body: "Get paid for space that would otherwise sit empty, minus a small commission." },
];

const WHY = [
  { title: "No upfront cost", body: "Listing your space on Luggo is free — you only pay a commission per completed booking." },
  { title: "You stay in control", body: "Set your own capacity, pricing, and operating hours. Pause bookings anytime." },
  { title: "New foot traffic", body: "Travelers dropping off or picking up bags may browse or buy while they're there." },
];

const REQUIREMENTS = [
  "A physical space that can be locked or supervised",
  "Someone on-site during your listed operating hours to check bags in/out",
  "A phone or tablet to scan QR codes at drop-off and pickup",
  "Accurate address and, ideally, a nearby landmark for travelers on foot",
];

const FAQS = [
  { q: "How much does it cost to join?", a: "Nothing upfront. Luggo takes a commission only on completed, paid bookings." },
  { q: "How do I get paid?", a: "Earnings accumulate in your partner dashboard and are settled in scheduled payouts by the Luggo team." },
  { q: "Can I reject a booking?", a: "You can pause new bookings anytime by disabling your listing, and cancel a specific booking if needed." },
  { q: "What if I only have space some days?", a: "Set your operating hours and capacity to match what's actually available — you're not locked into 24/7." },
];

const BUSINESS_TYPES = [
  { icon: Hotel, label: "Hotels & hostels" },
  { icon: Coffee, label: "Cafes" },
  { icon: Store, label: "Shops" },
  { icon: Package, label: "Dedicated luggage stores" },
];

export default function BecomePartnerPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    logEvent("PARTNER_PAGE_VIEW");
  }, []);

  const applyHref = !user ? "/register?role=PARTNER" : user.role === "PARTNER" ? "/partner/apply" : "/";

  return (
    <div>
      <section className="bg-gradient-to-b from-ink-950 to-ink-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Turn your extra space into income.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-300">
            Hotels, hostels, shops, cafes and businesses can earn by providing secure short-term luggage storage —
            listing is free, and you stay in control of your capacity and hours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={applyHref}
              onClick={() => logEvent("APPLICATION_STARTED")}
              className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-400"
            >
              Become a Storage Partner
            </Link>
            <Link
              to="#calculator"
              className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              See earnings estimate
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-ink-400">
            {BUSINESS_TYPES.map((b) => (
              <span key={b.label} className="flex items-center gap-2 text-sm">
                <b.icon className="h-4 w-4" />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-ink-900">How the partner program works</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border border-ink-100 bg-white p-6 shadow-card">
              <span className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <s.icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-ink-900">Why partner with Luggo</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="font-semibold text-ink-900">{w.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="calculator" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-bold text-ink-900">Estimate your earnings</h2>
        <EarningsCalculator />
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
          <ShieldCheck className="h-7 w-7 text-brand-600" />
          <h2 className="mt-3 text-2xl font-bold text-ink-900">Verification & safety</h2>
          <p className="mt-2 max-w-2xl text-ink-600">
            Every application is reviewed by the Luggo team before your listing goes live — we check your storage
            area, safety measures, and photos. You'll only start receiving bookings once approved, and you can pause
            bookings at any time from your partner dashboard.
          </p>
          <h3 className="mt-6 font-semibold text-ink-900">What you'll need</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-ink-900">Partner stories</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { name: "Vikram B., CP Cloakroom Services", text: "We had a spare room by the entrance doing nothing. Now it earns steady income every week." },
              { name: "Simran K., Bazaar Bag Points", text: "The dashboard makes check-in and check-out simple — just scan and go." },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
                <p className="text-sm text-ink-600">"{t.text}"</p>
                <p className="mt-3 text-sm font-semibold text-ink-800">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <section className="bg-brand-600 py-16 text-center text-white">
        <h2 className="text-2xl font-bold">Ready to list your space?</h2>
        <p className="mt-2 text-brand-50">Applications are usually reviewed within a few business days.</p>
        <Link
          to={applyHref}
          onClick={() => logEvent("APPLICATION_STARTED")}
          className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50"
        >
          Become a Storage Partner
        </Link>
      </section>
    </div>
  );
}
