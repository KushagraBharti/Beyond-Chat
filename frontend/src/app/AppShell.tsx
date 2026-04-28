import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import GlobalCursor from "../components/GlobalCursor";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { ComparePanelProvider } from "../features/compare/ComparePanelProvider";

const LandingPage = lazy(() => import("../pages/public/LandingPage"));
const PricingPage = lazy(() => import("../pages/public/PricingPage"));
const LoginPage = lazy(() => import("../pages/public/LoginPage"));
const AuthCallbackPage = lazy(() => import("../pages/public/AuthCallbackPage"));
const ResetPasswordPage = lazy(() => import("../pages/public/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() => import("../pages/public/ForgotPasswordPage"));
const HomePage = lazy(() => import("../pages/protected/HomePage"));
const ChatPage = lazy(() => import("../pages/protected/ChatPage"));
const WritingHomePage = lazy(() => import("../pages/protected/WritingHomePage"));
const WritingEditorPage = lazy(() => import("../pages/protected/WritingEditorPage"));
const ResearchPage = lazy(() => import("../pages/protected/ResearchPage"));
const ImagePage = lazy(() => import("../pages/protected/ImagePage"));
const DataPage = lazy(() => import("../pages/protected/DataPage"));
const FinancePage = lazy(() => import("../pages/protected/FinancePage"));
const ArtifactsPage = lazy(() => import("../pages/protected/ArtifactsPage"));
const SettingsPage = lazy(() => import("../pages/protected/SettingsPage"));
const ComparePage = lazy(() => import("../pages/protected/ComparePage"));

const Design1Executive = lazy(() => import("../pages/designs/Design1Executive"));
const Design2Modular = lazy(() => import("../pages/designs/Design2Modular"));
const Design3Premium = lazy(() => import("../pages/designs/Design3Premium"));
const Design4Calm = lazy(() => import("../pages/designs/Design4Calm"));
const Design5Guided = lazy(() => import("../pages/designs/Design5Guided"));
const Design6Spatial = lazy(() => import("../pages/designs/Design6Spatial"));

function RouteFallback() {
  return (
    <div className="route-fallback">
      <div className="route-fallback-card">
        <span>Loading workspace…</span>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function CursorMount() {
  const { pathname } = useLocation();
  const usePageCursor = pathname === "/" || pathname === "/pricing";

  if (usePageCursor) {
    return null;
  }

  return <GlobalCursor />;
}

export default function AppShell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ComparePanelProvider>
          <ScrollToTop />
          <CursorMount />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Chat and Image have their own dedicated layouts */}
              <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/image" element={<ProtectedRoute><ImagePage /></ProtectedRoute>} />

              {/* Temporary dashboard design previews — full-bleed, no DashboardLayout chrome */}
              <Route path="/designs/1" element={<ProtectedRoute><Design1Executive /></ProtectedRoute>} />
              <Route path="/designs/2" element={<ProtectedRoute><Design2Modular /></ProtectedRoute>} />
              <Route path="/designs/3" element={<ProtectedRoute><Design3Premium /></ProtectedRoute>} />
              <Route path="/designs/4" element={<ProtectedRoute><Design4Calm /></ProtectedRoute>} />
              <Route path="/designs/5" element={<ProtectedRoute><Design5Guided /></ProtectedRoute>} />
              <Route path="/designs/6" element={<ProtectedRoute><Design6Spatial /></ProtectedRoute>} />

              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<HomePage />} />
                <Route path="/writing" element={<WritingHomePage />} />
                <Route path="/writing/:documentId" element={<WritingEditorPage />} />
                <Route path="/research" element={<ResearchPage />} />
                <Route path="/data" element={<DataPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/artifacts" element={<ArtifactsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ComparePanelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
