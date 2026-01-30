"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useApprovals } from "./hooks/use-approval";
import { columns as createColumns } from "./components/data-table/columns";
import { approvedColumns } from "./components/data-table/approvedColumn";
import { ApprovalDataTable } from "./components/data-table";
import { InvoiceSummaryApprovalCard } from "./components/cards/InvoiceSummaryApprovalCard";
import { ActionConfirmationModal } from "./components/confirmation-modal";
import { mapRequestsToInvoiceRows } from "./lib/mapping";
import { mapToApprovalParams } from "./lib/utils";
import { ApprovalAction, InvoiceRow } from "./types";
import { RejectionModal } from "./components/rejection-modal";

export default function InvoiceCancellationApprovalPage() {
  const {
    pendingRequests,
    approvedRequests,
    isLoading,
    isProcessing,
    handleAction,
  } = useApprovals();

  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedForRejection, setSelectedForRejection] =
    useState<InvoiceRow | null>(null);

  const [pendingAction, setPendingAction] = useState<{
    type: ApprovalAction;
    data: InvoiceRow | InvoiceRow[];
  } | null>(null);

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Memoized Data Mapping
  const allRequests = useMemo(
    () => mapRequestsToInvoiceRows(pendingRequests, approvedRequests),
    [pendingRequests, approvedRequests],
  );

  // 2. Dashboard Statistics
  const stats = useMemo(
    () => ({
      approved: approvedRequests.length,
      pending: pendingRequests.length,
      highValue: pendingRequests.filter((r) => (r.total_amount || 0) > 20000)
        .length,
    }),
    [pendingRequests, approvedRequests],
  );

  // 3. Action Handlers
  const triggerActionConfirmation = useCallback(
    (type: ApprovalAction, data: any | any[]) => {
      // If it's a rejection and not a bulk action, open the Rejection Modal instead
      if (type === "REJECT" && !Array.isArray(data)) {
        setSelectedForRejection(data);
        setRejectionModalOpen(true);
      } else {
        setPendingAction({ type, data });
        setConfirmOpen(true);
      }
    },
    [],
  );

  const handleRejectionSuccess = () => {
    setRejectionModalOpen(false);
    setSelectedForRejection(null);
  };

  const confirmAndExecute = async (
    reasons?: string | Record<number, string>,
  ) => {
    if (!pendingAction?.data) return;

    const itemsToProcess = Array.isArray(pendingAction.data)
      ? pendingAction.data
      : [pendingAction.data];

    let paramsArray;
    let bulkReasonFallback: string | undefined = undefined;

    // Check if we are in "Individual Reasons" mode
    if (reasons && typeof reasons === "object" && !Array.isArray(reasons)) {
      paramsArray = itemsToProcess.map((item) => {
        const specificReason = reasons[item.id] || ""; // Ensure it's at least an empty string, not undefined
        return mapToApprovalParams(item, undefined, specificReason);
      });
      // In individual mode, we don't send a top-level bulk reason
      bulkReasonFallback = undefined;
    } else {
      // "Apply to All" or Single Rejection mode
      paramsArray = itemsToProcess.map((item) => mapToApprovalParams(item));
      bulkReasonFallback = reasons as string;
    }

    await handleAction(pendingAction.type, paramsArray, bulkReasonFallback);

    setConfirmOpen(false);
    setPendingAction(null);
  };

  // 4. Column Selection logic
  const columns = useMemo(() => {
    return activeTab === "APPROVED"
      ? approvedColumns
      : createColumns(triggerActionConfirmation, isProcessing);
  }, [activeTab, triggerActionConfirmation, isProcessing]);

  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2 py-4">
        <InvoiceSummaryApprovalCard stats={stats} />

        <ApprovalDataTable
          columns={columns}
          data={allRequests}
          isLoading={isLoading}
          isProcessing={isProcessing}
          onBulkAction={triggerActionConfirmation}
          currentTab={activeTab}
          onTabChange={(tab) => isMountedRef.current && setActiveTab(tab)}
        />

        <ActionConfirmationModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          pendingAction={pendingAction}
          isProcessing={isProcessing}
          onConfirm={confirmAndExecute}
        />

        <RejectionModal
          isOpen={rejectionModalOpen}
          onClose={() => setRejectionModalOpen(false)}
          requestData={
            selectedForRejection
              ? {
                  id: selectedForRejection.id,
                  invoice_id: selectedForRejection.invoice_id,
                }
              : null
          }
          onSuccess={handleRejectionSuccess}
          onReject={handleAction}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}
