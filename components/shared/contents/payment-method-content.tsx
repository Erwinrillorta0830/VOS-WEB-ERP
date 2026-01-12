import PaymentMethodCards from "../cards/payment-method-card";
import { PaymentMethodChart } from "../charts/payment-method-bar";
import { PaymentMethodPieChart } from "../charts/payment-method-pie";
import { DataTable } from "../data-table/payment-methods-data-table";
import { PaymentMethodPerformance } from "../data-table/payment-methods-data-table/types";

interface PaymentMethodsContentProps {
  data: PaymentMethodPerformance[];
}

export function PaymentMethodContent({ data }: PaymentMethodsContentProps) {
  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <PaymentMethodCards data={data} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PaymentMethodChart data={data} />
            <PaymentMethodPieChart data={data} />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
