import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Monitoring from "./pages/Monitoring";
import Reports from "./pages/Reports";
import PendingDemands from "./pages/PendingDemands";
import GroupsSettings from "./pages/settings/Groups";
import GroupMembers from "./pages/settings/GroupMembers";
import TeamSettings from "./pages/settings/Team";
import Settings from "./pages/settings/Settings";
import WhatsAppConnect from "./pages/settings/WhatsAppConnect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/pending-demands" element={<PendingDemands />} />
          <Route path="/settings/groups" element={<GroupsSettings />} />
          <Route path="/settings/groups/:groupId/members" element={<GroupMembers />} />
          <Route path="/settings/team" element={<TeamSettings />} />
          <Route path="/settings/whatsapp" element={<WhatsAppConnect />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
