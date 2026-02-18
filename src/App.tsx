import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Dispatch from "./pages/Dispatch";
import SimBriefDispatch from "./pages/SimBriefDispatch";
import OFPViewer from "./pages/OFPViewer";
import FlightBriefing from "./pages/FlightBriefing";
import SubmitPirep from "./pages/SubmitPirep";
import MyPireps from "./pages/MyPireps";
import Fleet from "./pages/Fleet";
import Shop from "./pages/Shop";
import Leaderboard from "./pages/Leaderboard";
import Logbook from "./pages/Logbook";
import AdminPanel from "./pages/admin/AdminPanel";
import AdminFleetPage from "./pages/admin/AdminFleetPage";
import AdminRegistrationsPage from "./pages/admin/AdminRegistrationsPage";
import AdminDispatchPage from "./pages/admin/AdminDispatchPage";
import AdminPirepsPage from "./pages/admin/AdminPirepsPage";
import AdminRoutesPage from "./pages/admin/AdminRoutesPage";
import AdminMultipliersPage from "./pages/admin/AdminMultipliersPage";
import PendingApproval from "./pages/PendingApproval";
import Notams from "./pages/Notams";
import AeronauticalCharts from "./pages/AeronauticalCharts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/simbrief" element={<SimBriefDispatch />} />
            <Route path="/ofp" element={<OFPViewer />} />
            <Route path="/flight-briefing" element={<FlightBriefing />} />
            <Route path="/pirep" element={<SubmitPirep />} />
            <Route path="/my-pireps" element={<MyPireps />} />
            <Route path="/fleet" element={<Fleet />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/leaderboards" element={<Leaderboard />} />
            <Route path="/logbook" element={<Logbook />} />
            <Route path="/notams" element={<Notams />} />
            <Route path="/charts" element={<AeronauticalCharts />} />
            <Route path="/type-ratings" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/fleet" element={<AdminFleetPage />} />
            <Route path="/admin/registrations" element={<AdminRegistrationsPage />} />
            <Route path="/admin/dispatch" element={<AdminDispatchPage />} />
            <Route path="/admin/pireps" element={<AdminPirepsPage />} />
            <Route path="/admin/routes" element={<AdminRoutesPage />} />
            <Route path="/admin/multipliers" element={<AdminMultipliersPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
