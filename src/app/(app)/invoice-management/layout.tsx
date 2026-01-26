"use-client";

import { AppSidebar } from "@/components/shared/(invoice-cancellation)/sidebar/app-sidebar";
import AppHeader from "@/components/shared/app-header";
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
            <AppHeader />
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
