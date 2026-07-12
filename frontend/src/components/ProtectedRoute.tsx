import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="route-fallback"><div className="route-fallback-card"><span>Checking organization access...</span></div></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}
