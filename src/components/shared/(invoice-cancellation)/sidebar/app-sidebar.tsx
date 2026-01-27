"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartNoAxesCombined,
  CircleCheckBig,
  FileXCorner,
  GalleryVerticalEnd,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { NavMain } from "./nav-main";
import { TeamSwitcher } from "./nav-header";
import { getInvoiceFallback, hasAccess } from "../permissions/permissions";

type VosSession = {
  user?: {
    user_department?: number | string | null;
    isAdmin?: boolean | number | string | null;
  };
  expiresAt?: number;
};

const BASE_NAV = [
  {
    title: "Defective Invoice Summary",
    icon: ChartNoAxesCombined,
    to: "/invoice-management/invoice-summary-report",
  },
  {
    title: "Invoice Cancellation Requests",
    icon: FileXCorner,
    to: "/invoice-management/invoice-cancellation",
  },
  {
    title: "Invoice Cancellation Approval",
    icon: CircleCheckBig,
    to: "/invoice-management/invoice-cancellation-approval",
  },
];

const readVosSession = (): VosSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("vosSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Date.now() > (parsed.expiresAt || 0) ? null : parsed;
  } catch {
    return null;
  }
};

const toNumber = (v: any) => (typeof v === "number" ? v : parseInt(v)) || null;
const toBool = (v: any) => v === true || v === 1 || v === "true" || v === "1";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<VosSession | null>(null);

  useEffect(() => {
    setSession(readVosSession());
  }, []);

  const userDept = toNumber(session?.user?.user_department);
  const isAdmin = toBool(session?.user?.isAdmin);

  const navMain = useMemo(() => {
    return BASE_NAV.filter((item) => hasAccess(item.to, userDept, isAdmin));
  }, [userDept, isAdmin]);

  useEffect(() => {
    if (
      !pathname ||
      userDept === null ||
      !pathname.startsWith("/invoice-management/")
    )
      return;

    if (!hasAccess(pathname, userDept, isAdmin)) {
      router.replace(getInvoiceFallback(userDept, isAdmin));
    }
  }, [pathname, userDept, isAdmin, router]);

  const teams = [
    {
      name: "Invoice Management",
      logo: GalleryVerticalEnd,
      type: "Vertex System Operations",
    },
  ];
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
