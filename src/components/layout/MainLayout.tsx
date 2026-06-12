import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { SnowEffect } from "./SnowEffect";
import { Snowflake } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

function MainLayoutContent({ children, headerContent }: MainLayoutProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="min-h-screen flex w-full relative">
      <SnowEffect />
      <AppSidebar />
      <main className="flex-1 flex flex-col relative z-10">
        <header className="border-b border-border/50 frosted-glass sticky top-0 z-20 px-4 h-14 flex items-center">
          <div className="flex items-center gap-4 w-full">
            {(!isCollapsed || !headerContent) && (headerContent || (
              <Snowflake className="h-5 w-5 text-primary animate-pulse" />
            ))}
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function MainLayout({ children, headerContent }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent headerContent={headerContent}>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
