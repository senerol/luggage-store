import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";
import { LoadingSpinner } from "./LoadingSpinner";

export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner className="min-h-[60vh]" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
