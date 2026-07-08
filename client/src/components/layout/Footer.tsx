import { Link } from "react-router-dom";
import { Luggage } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
              <Luggage className="h-4 w-4" />
            </span>
            Luggo
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-400">
            Safe, hourly luggage storage wherever you're traveling. Drop your bags, get on with your day.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Customers</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/search" className="hover:text-white">Find storage</Link></li>
            <li><Link to="/bookings" className="hover:text-white">My bookings</Link></li>
            <li><Link to="/about" className="hover:text-white">How it works</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Partners</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/become-partner" className="hover:text-white">Become a partner</Link></li>
            <li><Link to="/register?role=PARTNER" className="hover:text-white">Partner sign up</Link></li>
            <li><Link to="/partner/dashboard" className="hover:text-white">Partner dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-800 px-4 py-5 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Luggo. A student/portfolio project — not a real payment processor.
      </div>
    </footer>
  );
}
