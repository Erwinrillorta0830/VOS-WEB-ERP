import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);  

export const formatCurrencyDisplay = (
  amount: number,
  maxlength: 15
): string => {
  const formatted = formatCurrency(amount);

  if (formatted.length >= maxlength) {
    return formatted.slice(0, maxlength) + "...";
  }
  return formatted;
};

export const formatNumber = (amount: number): string =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const getCardColor = (index: number): string => {
  const colors = [
    "from-blue-500/10",
    "from-green-500/10",
    "from-purple-500/10",
    "from-orange-500/10",
  ];
  return colors[index % colors.length];
};
