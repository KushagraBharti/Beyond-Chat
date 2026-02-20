import { BrowserRouter, Routes, Route } from "react-router-dom";
import VariantPicker from "./VariantPicker";

import BroadsheetLanding from "./ui-variants/broadsheet/LandingPage";
import BroadsheetPricing from "./ui-variants/broadsheet/PricingPage";
import BroadsheetLogin from "./ui-variants/broadsheet/LoginPage";

import ToyboxLanding from "./ui-variants/toybox/LandingPage";
import ToyboxPricing from "./ui-variants/toybox/PricingPage";
import ToyboxLogin from "./ui-variants/toybox/LoginPage";

import AbyssLanding from "./ui-variants/abyss/LandingPage";
import AbyssPricing from "./ui-variants/abyss/PricingPage";
import AbyssLogin from "./ui-variants/abyss/LoginPage";

import AtelierLanding from "./ui-variants/atelier/LandingPage";
import AtelierPricing from "./ui-variants/atelier/PricingPage";
import AtelierLogin from "./ui-variants/atelier/LoginPage";

import ManifestoLanding from "./ui-variants/manifesto/LandingPage";
import ManifestoPricing from "./ui-variants/manifesto/PricingPage";
import ManifestoLogin from "./ui-variants/manifesto/LoginPage";

import TerrazzoLanding from "./ui-variants/terrazzo/LandingPage";
import TerrazzoPricing from "./ui-variants/terrazzo/PricingPage";
import TerrazzoLogin from "./ui-variants/terrazzo/LoginPage";

import NoirLanding from "./ui-variants/noir/LandingPage";
import NoirPricing from "./ui-variants/noir/PricingPage";
import NoirLogin from "./ui-variants/noir/LoginPage";

import WavelengthLanding from "./ui-variants/wavelength/LandingPage";
import WavelengthPricing from "./ui-variants/wavelength/PricingPage";
import WavelengthLogin from "./ui-variants/wavelength/LoginPage";

import ZenithLanding from "./ui-variants/zenith/LandingPage";
import ZenithPricing from "./ui-variants/zenith/PricingPage";
import ZenithLogin from "./ui-variants/zenith/LoginPage";

import AuraLanding from "./ui-variants/aura/LandingPage";
import AuraPricing from "./ui-variants/aura/PricingPage";
import AuraLogin from "./ui-variants/aura/LoginPage";

import CyberLanding from "./ui-variants/cyber/LandingPage";
import CyberPricing from "./ui-variants/cyber/PricingPage";
import CyberLogin from "./ui-variants/cyber/LoginPage";

import SketchbookLanding from "./ui-variants/sketchbook/LandingPage";
import SketchbookPricing from "./ui-variants/sketchbook/PricingPage";
import SketchbookLogin from "./ui-variants/sketchbook/LoginPage";

import MonolithLanding from "./ui-variants/monolith/LandingPage";
import MonolithPricing from "./ui-variants/monolith/PricingPage";
import MonolithLogin from "./ui-variants/monolith/LoginPage";

import SynthwaveLanding from "./ui-variants/synthwave/LandingPage";
import SynthwavePricing from "./ui-variants/synthwave/PricingPage";
import SynthwaveLogin from "./ui-variants/synthwave/LoginPage";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VariantPicker />} />

        <Route path="/broadsheet" element={<BroadsheetLanding />} />
        <Route path="/broadsheet/pricing" element={<BroadsheetPricing />} />
        <Route path="/broadsheet/login" element={<BroadsheetLogin />} />

        <Route path="/toybox" element={<ToyboxLanding />} />
        <Route path="/toybox/pricing" element={<ToyboxPricing />} />
        <Route path="/toybox/login" element={<ToyboxLogin />} />

        <Route path="/abyss" element={<AbyssLanding />} />
        <Route path="/abyss/pricing" element={<AbyssPricing />} />
        <Route path="/abyss/login" element={<AbyssLogin />} />

        <Route path="/atelier" element={<AtelierLanding />} />
        <Route path="/atelier/pricing" element={<AtelierPricing />} />
        <Route path="/atelier/login" element={<AtelierLogin />} />

        <Route path="/manifesto" element={<ManifestoLanding />} />
        <Route path="/manifesto/pricing" element={<ManifestoPricing />} />
        <Route path="/manifesto/login" element={<ManifestoLogin />} />

        <Route path="/terrazzo" element={<TerrazzoLanding />} />
        <Route path="/terrazzo/pricing" element={<TerrazzoPricing />} />
        <Route path="/terrazzo/login" element={<TerrazzoLogin />} />

        <Route path="/noir" element={<NoirLanding />} />
        <Route path="/noir/pricing" element={<NoirPricing />} />
        <Route path="/noir/login" element={<NoirLogin />} />

        <Route path="/wavelength" element={<WavelengthLanding />} />
        <Route path="/wavelength/pricing" element={<WavelengthPricing />} />
        <Route path="/wavelength/login" element={<WavelengthLogin />} />

        <Route path="/zenith" element={<ZenithLanding />} />
        <Route path="/zenith/pricing" element={<ZenithPricing />} />
        <Route path="/zenith/login" element={<ZenithLogin />} />

        {/* New Routes */}
        <Route path="/aura" element={<AuraLanding />} />
        <Route path="/aura/pricing" element={<AuraPricing />} />
        <Route path="/aura/login" element={<AuraLogin />} />

        <Route path="/cyber" element={<CyberLanding />} />
        <Route path="/cyber/pricing" element={<CyberPricing />} />
        <Route path="/cyber/login" element={<CyberLogin />} />

        <Route path="/sketchbook" element={<SketchbookLanding />} />
        <Route path="/sketchbook/pricing" element={<SketchbookPricing />} />
        <Route path="/sketchbook/login" element={<SketchbookLogin />} />

        <Route path="/monolith" element={<MonolithLanding />} />
        <Route path="/monolith/pricing" element={<MonolithPricing />} />
        <Route path="/monolith/login" element={<MonolithLogin />} />

        <Route path="/synthwave" element={<SynthwaveLanding />} />
        <Route path="/synthwave/pricing" element={<SynthwavePricing />} />
        <Route path="/synthwave/login" element={<SynthwaveLogin />} />

      </Routes>
    </BrowserRouter>
  );
}
