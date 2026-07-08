import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Luggage, Menu, X, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    toast.success("Logged out");
    navigate("/");
  }

  const dashboardHref = user?.role === "ADMIN" ? "/admin/dashboard" : user?.role === "PARTNER" ? "/partner/dashboard" : "/bookings";

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Luggage className="h-4 w-4" />
          </span>
          <span className="text-lg">Luggo</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-600 md:flex">
          <Link to="/search" className="hover:text-ink-900">
            Find Storage
          </Link>
          <Link to="/become-partner" className="hover:text-ink-900">
            Become a Partner
          </Link>
          <Link to="/about" className="hover:text-ink-900">
            How it works
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <NotificationBell />
              <Link
                to={dashboardHref}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                <UserIcon className="h-4 w-4" />
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <button className="p-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            <Link to="/search" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-50">
              Find Storage
            </Link>
            <Link to="/become-partner" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-50">
              Become a Partner
            </Link>
            {user ? (
              <>
                <Link to={dashboardHref} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-50">
                  Dashboard
                </Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-50">
                  Profile
                </Link>
                <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-ink-500 hover:bg-ink-50">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-50">
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
