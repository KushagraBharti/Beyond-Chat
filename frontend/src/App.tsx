import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { clearMvpBypassSession } from "./lib/mvpBypass";
import { supabase } from "./lib/supabaseClient";
import { setStoredWorkspaceId } from "./lib/api";
import { useEffect as ReactUseEffect } from "react";
const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const PricingPage = lazy(() => import("./pages/public/PricingPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const SignUpPage = lazy(() => import("./pages/public/SignUpPage"));
const HomePage = lazy(() => import("./pages/protected/HomePage"));
const ChatPage = lazy(() => import("./pages/protected/ChatPage"));
const WritingHomePage = lazy(() => import("./pages/protected/WritingHomePage"));
const WritingEditorPage = lazy(() => import("./pages/protected/WritingEditorPage"));
const ResearchPage = lazy(() => import("./pages/protected/ResearchPage"));
const ImagePage = lazy(() => import("./pages/protected/ImagePage"));
const DataPage = lazy(() => import("./pages/protected/DataPage"));
const FinancePage = lazy(() => import("./pages/protected/FinancePage"));
const ArtifactsPage = lazy(() => import("./pages/protected/ArtifactsPage"));
const SettingsPage = lazy(() => import("./pages/protected/SettingsPage"));

function LogoutRoute() {
  ReactUseEffect(() => {
    clearMvpBypassSession();
    setStoredWorkspaceId(null);
    if (supabase) {
      supabase.auth.signOut().then(() => {
        window.location.href = "/login";
      });
    } else {
      window.location.href = "/login";
    }
  }, []);
  return null;
}

function RouteFallback() {
  return (
    <div className="route-fallback">
      <div className="route-fallback-card">
        <span>Loading workspace…</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/logout" element={<LogoutRoute />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/writing" element={<WritingHomePage />} />
              <Route path="/writing/:documentId" element={<WritingEditorPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/image" element={<ImagePage />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/artifacts" element={<ArtifactsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
