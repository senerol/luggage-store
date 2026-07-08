import { NavLink, Outlet } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Navbar } from "@/components/layout/Navbar";

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function DashboardLayout({ title, items }: { title: string; items: DashboardNavItem[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-100"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
