"use client";

import { type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

// Role badge configuration (Phase 1: visual only)
const roleBadges: Record<string, { text: string; color: string }> = {
  "/pages/summary-report": {
    text: "ADMIN",
    color: "bg-red-100 text-red-700 border-red-300",
  },
  "/pages/salesman-performance": {
    text: "ADMIN",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  "/pages/payment-methods": {
    text: "ALL",
    color: "bg-green-100 text-green-700 border-green-300",
  },
  "/pages/daily-collection": {
    text: "MANAGER+",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  "/pages/customer-analysis": {
    text: "ADMIN",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  "/pages/check-register": {
    text: "ADMIN",
    color: "bg-red-100 text-red-700 border-red-300",
  },
  "/pages/regional-analysis": {
    text: "ADMIN",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
};

export function NavMain({
  items,
}: {
  items: {
    title: string;
    to: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      to: string;
    }[];
  }[];
}) {
  const [activeItem, setActiveItem] = useState<string>("");
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground">
        PLATFORM
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.to}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={activeItem === item.title}
                  onClick={() => setActiveItem(item.title)}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
