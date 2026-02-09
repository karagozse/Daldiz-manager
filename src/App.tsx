import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Gardens from "./pages/Gardens";
import GardenDetail from "./pages/GardenDetail";
import InspectionForm from "./pages/InspectionForm";
import EvaluationForm from "./pages/EvaluationForm";
import InspectionSummary from "./pages/InspectionSummary";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Analysis from "./pages/Analysis";
import HarvestList from "./pages/HarvestList";
import HarvestFormPage from "./pages/HarvestFormPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { BackendConnectionLostModal } from "./components/BackendConnectionLostModal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackendConnectionLostModal />
        <Routes>
          {/* Public route - Login page */}
          <Route path="/" element={<Login />} />
          
          {/* Protected routes - require authentication */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/bahceler" element={
            <ProtectedRoute>
              <Gardens />
            </ProtectedRoute>
          } />
          <Route path="/bahce/:id" element={
            <ProtectedRoute>
              <GardenDetail />
            </ProtectedRoute>
          } />
          <Route path="/bahce/:id/denetim" element={
            <ProtectedRoute requiredRoles={["CONSULTANT", "SUPER_ADMIN"]}>
              <InspectionForm />
            </ProtectedRoute>
          } />
          <Route path="/bahce/:id/degerlendirme/:inspectionId" element={
            <ProtectedRoute requiredRoles={["LEAD_AUDITOR", "SUPER_ADMIN"]}>
              <EvaluationForm />
            </ProtectedRoute>
          } />
          <Route path="/bahce/:id/ozet" element={
            <ProtectedRoute>
              <InspectionSummary />
            </ProtectedRoute>
          } />
          <Route path="/profil" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/analiz" element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          } />
          <Route path="/hasat" element={
            <ProtectedRoute>
              <HarvestList />
            </ProtectedRoute>
          } />
          <Route path="/hasat/:id" element={
            <ProtectedRoute>
              <HarvestFormPage />
            </ProtectedRoute>
          } />
          
          {/* 404 - Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
