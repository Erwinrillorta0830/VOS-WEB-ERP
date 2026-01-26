"use-client";

import AppHeader from "@/components/shared/app-header";
import { AppSidebar } from "@/components/shared/sidebarr/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const DashboardLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header>
            <AppHeader to={""} />
          </header>
          <main className="flex flex-col">
            <section className="flex flex-col gap-4 min-h-screen">
              {children}
              <Toaster richColors />
            </section>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default DashboardLayout;
