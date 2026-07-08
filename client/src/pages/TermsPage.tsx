import { PageHeader } from "@/components/common/PageHeader";

export default function TermsPage() {
  return (
    <div>
      <PageHeader title="Terms of Service" subtitle="Last updated for this demo project — not a real legal document." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-6 text-ink-600 sm:px-6 lg:px-8">
        <p>
          Luggo is a portfolio/demonstration project. These terms are illustrative placeholder content showing
          where a real platform's terms of service would live, covering booking conduct, luggage restrictions,
          liability limits, partner obligations, and dispute resolution.
        </p>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-900">1. Bookings</h2>
          <p>
            A booking reserves storage capacity for the selected time window. Arriving significantly outside your
            booked window may affect availability of your slot.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-900">2. Prohibited items</h2>
          <p>Storage partners may refuse hazardous, perishable, or illegal items at their discretion.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-900">3. Partner terms</h2>
          <p>
            Storage partners agree to keep listed capacity and operating hours accurate, and to check items in/out
            only via the Luggo QR verification flow.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-900">4. Liability</h2>
          <p>Placeholder liability terms would be specified here in a production deployment.</p>
        </section>
      </div>
    </div>
  );
}
