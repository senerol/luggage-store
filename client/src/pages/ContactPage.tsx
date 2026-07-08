import { Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export default function ContactPage() {
  return (
    <div>
      <PageHeader title="Get in touch" subtitle="Questions about a booking, a partner application, or anything else." />
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
          <Mail className="h-6 w-6 text-brand-600" />
          <h3 className="mt-3 font-semibold text-ink-900">Email support</h3>
          <p className="mt-1 text-sm text-ink-500">support@luggo.example — usually replies within a day.</p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-card">
          <MessageCircle className="h-6 w-6 text-brand-600" />
          <h3 className="mt-3 font-semibold text-ink-900">Partner support</h3>
          <p className="mt-1 text-sm text-ink-500">
            Already applying to become a partner? Check your application status from your{" "}
            <a href="/partner/applications" className="text-brand-700 underline">
              partner dashboard
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
