"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ApprovalParams } from "../../invoice-cancellation/types";

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestData: { id: number; invoice_id: number | string } | null;
  // Change: Expect the hook's handleAction instead of auditorId
  onReject: (
    action: "REJECT",
    params: ApprovalParams[],
    reason: string,
  ) => Promise<void>;
  isProcessing: boolean;
  onSuccess: () => void;
}

export function RejectionModal({
  isOpen,
  onClose,
  requestData,
  onReject,
  isProcessing,
  onSuccess,
}: RejectionModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!requestData) return;
    if (!reason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    try {
      // Use the logic already defined in your useApprovals hook
      await onReject(
        "REJECT",
        [
          {
            requestId: requestData.id,
            invoiceId: Number(requestData.invoice_id),
            orderNo: "", // Required by type, but not used by the rejection API logic
          },
        ],
        reason,
      );

      setReason("");
      onSuccess();
      onClose();
    } catch (error: any) {
      // Hook already handles toast errors, but you can add specific logic here if needed
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reason for Rejection</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Type the reason why this cancellation is being rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
            disabled={isProcessing}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isProcessing || !reason.trim()}
          >
            {isProcessing ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
