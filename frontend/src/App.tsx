import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/public/LandingPage";
import PricingPage from "./pages/public/PricingPage";
import LoginPage from "./pages/public/LoginPage";
import HomePage from "./pages/protected/HomePage";
import StudioPage from "./pages/protected/StudioPage";
import ComparePage from "./pages/protected/ComparePage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <HomePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/studio/compare"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ComparePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/studio/:studioId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <StudioPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
