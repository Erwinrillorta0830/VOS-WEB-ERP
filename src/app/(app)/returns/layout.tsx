import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppShell } from "../../../modules/return-management/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sales Return",
  description: "VOS-Web Sales Return",
  icons: {
    icon: "/vos-erp-logo.ico",
  },
};

export default function ReturnsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Just return the children wrapped in your shell or a Fragment.
    // The main <html> and <body> are provided by src/app/layout.tsx
    <AppShell>{children}</AppShell>
  );
}
