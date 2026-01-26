import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { SnowEffect } from "./SnowEffect";
import { Snowflake } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export function MainLayout({ children, headerContent }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <SnowEffect />
        <AppSidebar />
        <main className="flex-1 flex flex-col relative z-10">
          <header className="border-b border-border/50 frosted-glass sticky top-0 z-20 px-4 py-3">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {headerContent || (
                <Snowflake className="h-5 w-5 text-primary animate-pulse" />
              )}
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
