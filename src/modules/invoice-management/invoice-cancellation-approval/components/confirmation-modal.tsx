"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { ApprovalAction, InvoiceRow } from "../types";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingAction: {
    type: ApprovalAction;
    data: InvoiceRow | InvoiceRow[];
  } | null;
  isProcessing: boolean;
  // Updated to pass reasons back
  onConfirm: (reasons?: string | Record<number, string>) => Promise<void>;
}

export function ActionConfirmationModal({
  open,
  onOpenChange,
  pendingAction,
  isProcessing,
  onConfirm,
}: ConfirmationModalProps) {
  const [useSameReason, setUseSameReason] = useState(true);
  const [commonReason, setCommonReason] = useState("");
  const [individualReasons, setIndividualReasons] = useState<
    Record<number, string>
  >({});

  // Reset local state when modal closes
  useEffect(() => {
    if (!open) {
      setCommonReason("");
      setIndividualReasons({});
      setUseSameReason(true);
    }
  }, [open]);

  const selectedItems = useMemo(() => {
    if (!pendingAction?.data) return [];
    return Array.isArray(pendingAction.data)
      ? pendingAction.data
      : [pendingAction.data];
  }, [pendingAction]);

  const isBulk = selectedItems.length > 1;
  const isRejection = pendingAction?.type === "REJECT";

  const totalAmount = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    [selectedItems],
  );

  const handleConfirm = () => {
    if (isRejection) {
      onConfirm(useSameReason ? commonReason : individualReasons);
    } else {
      onConfirm();
    }
  };

  const isConfirmDisabled = useMemo(() => {
    if (isProcessing) return true;
    if (isRejection) {
      if (useSameReason) return !commonReason.trim();
      // For individual mode, ensure every item has a reason
      return selectedItems.some((item) => !individualReasons[item.id]?.trim());
    }
    return false;
  }, [
    isProcessing,
    isRejection,
    useSameReason,
    commonReason,
    individualReasons,
    selectedItems,
  ]);

  if (!pendingAction) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md lg:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Confirm{" "}
            {pendingAction.type === "APPROVE" ? "Approval" : "Rejection"}
            {isBulk && (
              <span className="text-sm font-normal text-muted-foreground">
                ({selectedItems.length} items)
              </span>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4" asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Are you sure you want to{" "}
                <strong
                  className={
                    pendingAction.type === "APPROVE"
                      ? "text-blue-600"
                      : "text-red-600"
                  }
                >
                  {pendingAction.type.toUpperCase()}
                </strong>{" "}
                the cancellation request{isBulk ? "s" : ""}?
              </p>

              {/* REJECTION REASON SECTION */}
              {isRejection && (
                <div className="space-y-4 border rounded-lg p-4 bg-background/50">
                  {isBulk && (
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Switch
                        id="bulk-reason-mode"
                        checked={useSameReason}
                        onCheckedChange={setUseSameReason}
                      />
                      <Label htmlFor="bulk-reason-mode" className="text-xs">
                        Apply the same reason to all items
                      </Label>
                    </div>
                  )}

                  <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                    {useSameReason ? (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold">
                          Reason for Rejection
                        </Label>
                        <Textarea
                          placeholder="Why are these being rejected?"
                          value={commonReason}
                          onChange={(e) => setCommonReason(e.target.value)}
                          className="min-h-20 bg-background"
                        />
                      </div>
                    ) : (
                      selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="space-y-1.5 p-2 rounded border bg-background"
                        >
                          <Label className="text-[10px] uppercase font-bold text-blue-600">
                            Invoice: {item.invoice_no}
                          </Label>
                          <Textarea
                            placeholder="Specific reason..."
                            value={individualReasons[item.id] || ""}
                            onChange={(e) =>
                              setIndividualReasons((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="min-h-[60px] text-xs"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* BATCH SUMMARY */}
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                {isBulk ? (
                  <div className="flex justify-between font-bold text-blue-700">
                    <span>
                      Total Batch Amount ({selectedItems.length} items)
                    </span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="font-medium uppercase text-[10px]">
                      Invoice {selectedItems[0]?.invoice_no}
                    </span>
                    <span className="font-bold">
                      {formatCurrency(selectedItems[0]?.total_amount)}
                    </span>
                  </div>
                )}
              </div>

              <Alert
                variant={
                  pendingAction.type === "APPROVE" ? "destructive" : "default"
                }
                className="py-2"
              >
                {pendingAction.type === "APPROVE" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {pendingAction.type === "APPROVE"
                    ? "Irreversible"
                    : "Return to Dispatch"}
                </AlertTitle>
                <AlertDescription className="text-[11px]">
                  {pendingAction.type === "APPROVE"
                    ? "This will void the invoice and reset the Sales Order."
                    : "This will return items to the active dispatch list."}
                </AlertDescription>
              </Alert>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isConfirmDisabled}
            className={
              pendingAction.type === "APPROVE"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              `Confirm ${pendingAction.type === "APPROVE" ? "Approval" : "Rejection"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
