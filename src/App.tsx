import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Monitoring from "./pages/Monitoring";
import PendingDemands from "./pages/PendingDemands";
import GroupsSettings from "./pages/settings/Groups";
import GroupMembers from "./pages/settings/GroupMembers";
import TeamSettings from "./pages/settings/Team";
import Settings from "./pages/settings/Settings";
import WhatsAppConnect from "./pages/settings/WhatsAppConnect";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/auth"
              element={session ? <Navigate to="/" replace /> : <Auth />}
            />
            <Route
              path="/"
              element={<ProtectedRoute session={session}><Index /></ProtectedRoute>}
            />
            <Route
              path="/monitoring"
              element={<ProtectedRoute session={session}><Monitoring /></ProtectedRoute>}
            />
            <Route
              path="/pending-demands"
              element={<ProtectedRoute session={session}><PendingDemands /></ProtectedRoute>}
            />
            <Route
              path="/settings/groups"
              element={<ProtectedRoute session={session}><GroupsSettings /></ProtectedRoute>}
            />
            <Route
              path="/settings/groups/:groupId/members"
              element={<ProtectedRoute session={session}><GroupMembers /></ProtectedRoute>}
            />
            <Route
              path="/settings/team"
              element={<ProtectedRoute session={session}><TeamSettings /></ProtectedRoute>}
            />
            <Route
              path="/settings/whatsapp"
              element={<ProtectedRoute session={session}><WhatsAppConnect /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute session={session}><Settings /></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
