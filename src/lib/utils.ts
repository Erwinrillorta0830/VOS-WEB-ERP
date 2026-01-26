// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

// optional helper for Tailwind class names
export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

export const getCardColor = (index: number): string => {
    const colors = [
        "from-blue-500/10",
        "from-green-500/10",
        "from-purple-500/10",
        "from-orange-500/10",
    ];
    return colors[index % colors.length];
};