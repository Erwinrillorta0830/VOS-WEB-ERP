"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

export function ExportReportDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPrint: () => void;
}) {
  const { open, onOpenChange, onPrint } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          {/* ✅ FIX: DialogTitle present */}
          <DialogTitle>What needs to be printed?</DialogTitle>
          <DialogDescription>Select the criteria for the report you want to print.</DialogDescription>
        </DialogHeader>

        {/* If you already have your print filters inside the main page, keep this dialog simple.
            You can expand this later to match your screenshot 4 exactly (salesman, customer, status, quick ranges). */}
        <div className="text-sm text-slate-600">
          This will print the current filtered result set shown in the table.
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gap-2" onClick={onPrint}>
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
