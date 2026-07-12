import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import GlobalCursor from "../components/GlobalCursor";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { ComparePanelProvider } from "../features/compare/ComparePanelProvider";
import { ProjectProvider } from "../features/workspace/ProjectContext";
import { WorkspaceLayout } from "../components/workspace/WorkspaceShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const GeneralAgentPage = lazy(() => import("../pages/protected/ChatPage"));
const ResearchAgentPage = lazy(() => import("../pages/protected/ResearchPage"));
const FinanceAgentPage = lazy(() => import("../pages/protected/FinancePage"));
const HomeWorkspacePage = lazy(() => import("../pages/workspace/HomeWorkspacePage").then((module) => ({ default: module.HomeWorkspacePage })));
const ChatWorkspacePage = lazy(() => import("../pages/workspace/ChatWorkspacePage").then((module) => ({ default: module.ChatWorkspacePage })));
const WorkListPage = lazy(() => import("../pages/workspace/WorkWorkspacePages").then((module) => ({ default: module.WorkListPage })));
const WorkDetailPage = lazy(() => import("../pages/workspace/WorkWorkspacePages").then((module) => ({ default: module.WorkDetailPage })));
const BrowsePages = lazy(() => import("../pages/workspace/WorkspaceBrowsePages").then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("../pages/workspace/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })));
const AgentsPage = lazy(() => import("../pages/workspace/WorkspaceBrowsePages").then((module) => ({ default: module.AgentsPage })));
const KnowledgeAppsPage = lazy(() => import("../pages/workspace/WorkspaceBrowsePages").then((module) => ({ default: module.KnowledgeAppsPage })));
const ComposioCallbackPage = lazy(() => import("../pages/workspace/ComposioCallbackPage").then((module) => ({ default: module.ComposioCallbackPage })));
const SettingsWorkspacePage = lazy(() => import("../pages/workspace/WorkspaceBrowsePages").then((module) => ({ default: module.SettingsWorkspacePage })));
const AdminPage = lazy(() => import("../pages/workspace/WorkspaceBrowsePages").then((module) => ({ default: module.AdminPage })));
const FeaturePages = {
  agentBuilder: lazy(() => import("../pages/workspace/WorkspaceFeaturePages").then((module) => ({ default: module.AgentBuilderPage }))),
  automations: lazy(() => import("../pages/workspace/WorkspaceFeaturePages").then((module) => ({ default: module.AutomationsWorkspacePage }))),
  memory: lazy(() => import("../pages/workspace/WorkspaceFeaturePages").then((module) => ({ default: module.MemoryWorkspacePage }))),
  output: lazy(() => import("../pages/workspace/WorkspaceFeaturePages").then((module) => ({ default: module.OutputWorkspacePage }))),
};
const LegacyMigrationPage = lazy(() => import("../pages/workspace/LegacyMigrationPage").then((module) => ({ default: module.LegacyMigrationPage })));

const LandingPage = lazy(() => import("../pages/public/LandingPage"));
const PricingPage = lazy(() => import("../pages/public/PricingPage"));
const LoginPage = lazy(() => import("../pages/public/LoginPage"));
const AuthCallbackPage = lazy(() => import("../pages/public/AuthCallbackPage"));
const BillingSuccessPage = lazy(() => import("../pages/public/BillingSuccessPage"));
const TermsPage = lazy(() => import("../pages/public/TermsPage"));
const PrivacyPage = lazy(() => import("../pages/public/PrivacyPage"));
const ForgotPasswordPage = lazy(() => import("../pages/public/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/public/ResetPasswordPage"));

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
        <span>Loading account...</span>
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
          <RouteErrorBoundary><Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/billing/success" element={<BillingSuccessPage />} />
              <Route path="/billing/cancel" element={<Navigate to="/pricing" replace />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

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
                    <ProjectProvider>
                      <WorkspaceLayout />
                    </ProjectProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<HomeWorkspacePage />} />
                <Route path="/dashboard" element={<Navigate to="/home" replace />} />
                <Route path="/chat" element={<ChatWorkspacePage />} />
                <Route path="/work" element={<WorkListPage />} />
                <Route path="/work/new" element={<WorkDetailPage />} />
                <Route path="/work/:workId" element={<WorkDetailPage />} />
                <Route path="/projects" element={<BrowsePages />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/agents/new" element={<FeaturePages.agentBuilder />} />
                <Route path="/agents/general" element={<GeneralAgentPage />} />
                <Route path="/agents/research" element={<ResearchAgentPage />} />
                <Route path="/agents/finance" element={<FinanceAgentPage />} />
                <Route path="/knowledge-apps" element={<KnowledgeAppsPage />} />
                <Route path="/connections/callback/projects/:projectId/connections/:connectionId/callback" element={<ComposioCallbackPage />} />
                <Route path="/memory" element={<FeaturePages.memory />} />
                <Route path="/outputs/:outputId" element={<FeaturePages.output />} />
                <Route path="/outputs" element={<FeaturePages.output />} />
                <Route path="/automations" element={<FeaturePages.automations />} />
                <Route path="/settings" element={<SettingsWorkspacePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/writing" element={<LegacyMigrationPage legacy="writing" />} />
                <Route path="/writing/:documentId" element={<LegacyMigrationPage legacy="writing" />} />
                <Route path="/research" element={<LegacyMigrationPage legacy="research" />} />
                <Route path="/image" element={<LegacyMigrationPage legacy="image" />} />
                <Route path="/data" element={<LegacyMigrationPage legacy="data" />} />
                <Route path="/finance" element={<LegacyMigrationPage legacy="finance" />} />
                <Route path="/artifacts" element={<LegacyMigrationPage legacy="artifacts" />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense></RouteErrorBoundary>
        </ComparePanelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
