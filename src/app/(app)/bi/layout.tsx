import React from "react";
import { FilterProvider } from "../../contexts/filter-context";
import { ThemeProvider } from "@/components/theme-provide";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/sidebar/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import AppHeader from "@/components/shared/header/app-header";

const DashboardLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <FilterProvider>
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
                <Toaster />
              </section>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </FilterProvider>
  );
};

export default DashboardLayout;
