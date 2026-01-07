"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

interface AppHeaderProps {
  title?: string;
  to: string;
}

const DISABLED_SEGMENTS = ["bi"];

function formatSegment(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AppHeader({}: AppHeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <header className="flex border-b h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <nav className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const href = "/" + segments.slice(0, index + 1).join("/");
              const isLast = index === segments.length - 1;
              const isDisabled = DISABLED_SEGMENTS.includes(segment);

              return (
                <BreadcrumbItem key={href}>
                  {isLast || isDisabled ? (
                    <BreadcrumbPage>{formatSegment(segment)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>
                      {formatSegment(segment)}
                    </BreadcrumbLink>
                  )}
                  {!isLast && <BreadcrumbSeparator />}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </nav>
    </header>
  );
}
