import { Link } from "react-router-dom";
import { Mail, Phone, ShieldCheck, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return <LoadingSpinner className="min-h-[60vh]" />;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-ink-900">Profile</h1>
      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-900">{user.name}</p>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">{user.role}</span>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm text-ink-600">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-ink-400" /> {user.email}
          </p>
          {user.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-ink-400" /> {user.phone}
            </p>
          )}
          {user.partnerProfile && (
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-ink-400" />
              {user.partnerProfile.businessName}
              {user.partnerProfile.approved ? (
                <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified partner
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700">Pending approval</span>
              )}
            </p>
          )}
        </div>

        {user.role === "PARTNER" && (
          <Link
            to="/partner/applications"
            className="mt-6 block rounded-lg border border-ink-200 py-2.5 text-center text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            View application status
          </Link>
        )}
      </div>
    </div>
  );
}
