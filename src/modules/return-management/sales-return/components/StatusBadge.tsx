import { Badge } from "@/components/ui/badge";
import { SalesReturnStatus } from "../types";

interface StatusBadgeProps {
  status: SalesReturnStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let className = "";

  switch (status) {
    case "Received":
      variant = "secondary"; 
      className = "bg-green-100 text-green-800 hover:bg-green-100"
      break;
    case "Pending":
      variant = "secondary";
      className = "bg-orange-100 text-orange-800 hover:bg-orange-100"
      break;
  }

  return <Badge variant={variant} className={className}>{status}</Badge>;
}