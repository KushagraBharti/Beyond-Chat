import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}
