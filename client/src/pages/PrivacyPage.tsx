import { PageHeader } from "@/components/common/PageHeader";

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader title="Privacy Policy" subtitle="Placeholder content for this demo project." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-6 text-ink-600 sm:px-6 lg:px-8">
        <p>
          Luggo stores your name, email, phone number, and booking history to operate the service. Passwords are
          hashed and never stored in plain text. QR codes issued for bookings contain only an opaque token — never
          your name, contact details, or booking contents.
        </p>
        <p>
          Payment details are handled entirely by Razorpay; Luggo's servers never see or store your card details.
        </p>
        <p>Storage partners can see the name and phone number of customers with an active booking at their location.</p>
      </div>
    </div>
  );
}
