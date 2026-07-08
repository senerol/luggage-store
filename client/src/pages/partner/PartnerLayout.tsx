import { LayoutDashboard, Warehouse, CalendarCheck, ScanLine, Wallet, FileText } from "lucide-react";
import { DashboardLayout, DashboardNavItem } from "@/layouts/DashboardLayout";

const items: DashboardNavItem[] = [
  { to: "/partner/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/partner/storage", label: "My storage", icon: Warehouse },
  { to: "/partner/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/partner/check-in", label: "Check-in / out", icon: ScanLine },
  { to: "/partner/revenue", label: "Revenue", icon: Wallet },
  { to: "/partner/applications", label: "Applications", icon: FileText },
];

export function PartnerLayout() {
  return <DashboardLayout title="Partner" items={items} />;
}
