import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Returns</h1>
        <p className="text-muted-foreground">
          Manage customer product returns
        </p>
      </div>
      <Button onClick={onAddClick}>
        <Plus className="mr-2 h-4 w-4" /> Add New Sales Return
      </Button>
    </div>
  );
}