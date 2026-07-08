import {
  LayoutDashboard,
  Users,
  Building2,
  Warehouse,
  FileText,
  CalendarCheck,
  CreditCard,
  Star,
  Flag,
  Wallet,
  Settings,
} from "lucide-react";
import { DashboardLayout, DashboardNavItem } from "@/layouts/DashboardLayout";

const items: DashboardNavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/partners", label: "Partners", icon: Building2 },
  { to: "/admin/storage", label: "Storage", icon: Warehouse },
  { to: "/admin/applications", label: "Applications", icon: FileText },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/payouts", label: "Payouts", icon: Wallet },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  return <DashboardLayout title="Admin" items={items} />;
}
