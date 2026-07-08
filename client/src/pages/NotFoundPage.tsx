import { Link } from "react-router-dom";
import { Luggage } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Luggage className="h-10 w-10 text-brand-600" />
      <h1 className="text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="text-ink-500">This bag seems to have gone missing. Let's get you back on track.</p>
      <Link to="/" className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
        Back to home
      </Link>
    </div>
  );
}
