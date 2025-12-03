import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { SnowEffect } from "./SnowEffect";
import { Snowflake } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <SnowEffect />
        <AppSidebar />
        <main className="flex-1 flex flex-col relative z-10">
          <header className="h-14 border-b border-border/50 flex items-center px-4 frosted-glass sticky top-0 z-20">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-primary animate-pulse" />
              <h1 className="text-lg font-semibold text-foreground">SLA Watcher</h1>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
