"use client";

import {
  Calendar,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CreditCard,
  FileChartColumnIncreasing,
  GalleryVerticalEnd,
  Globe,
  Grid2x2,
  HandHelping,
  Settings2,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { TeamSwitcher } from "./nav-header";
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Vertex Tech Corp.",
      logo: GalleryVerticalEnd,
      type: "Organization",
    },
  ],
  navMain: [
    {
      title: "Summary Report",
      icon: ChartNoAxesCombined,
      to: "/bi/summary-report",
    },
    {
      title: "Salesman Performance",
      icon: Users,
      to: "/bi/salesman-performance",
    },
    {
      title: "Payment Methods",
      icon: CreditCard,
      to: "/bi/payment-methods",
    },
    {
      title: "Daily Collection",
      icon: Calendar,
      to: "/bi/daily-collection",
    },
    {
      title: "Customer Analysis",
      icon: FileChartColumnIncreasing,
      to: "/bi/customer-analysis",
    },
    {
      title: "Check Register",
      icon: Check,
      to: "/bi/check-register",
    },
    {
      title: "Regional Analysis",
      icon: Globe,
      to: "/bi/regional-analysis",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
