import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/public/LandingPage";
import PricingPage from "./pages/public/PricingPage";
import LoginPage from "./pages/public/LoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
