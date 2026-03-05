import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isMvpBypassSessionActive } from "../lib/mvpBypass";
import { isMvpBypassEnabled } from "../lib/supabaseClient";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, mvpBypassActive } = useAuth();
  const bypassGranted = mvpBypassActive || (isMvpBypassEnabled && isMvpBypassSessionActive());

  if (loading) return null;
  if (!session && !bypassGranted) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
