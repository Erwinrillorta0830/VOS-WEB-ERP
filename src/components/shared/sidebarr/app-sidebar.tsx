"use client";

import {
  ChartNoAxesCombined,
  CircleCheckBig,
  FileXCorner,
  GalleryVerticalEnd,
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
      name: "Invoice Manager",
      logo: GalleryVerticalEnd,
      type: "Vertex System Operations",
    },
  ],
  navMain: [
    {
      title: "Invoice Summary",
      icon: ChartNoAxesCombined,
      to: "/invoice-management/invoice-summary-report",
    },
    {
      title: "Invoice Cancellation",
      icon: FileXCorner,
      to: "/invoice-management/invoice-cancellation",
    },
    {
      title: "Invoice Approval",
      icon: CircleCheckBig,
      to: "/invoice-management/invoice-cancellation-approval",
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
      <SidebarRail />
    </Sidebar>
  );
}
