import { Info } from "lucide-react";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { formatMoney } from "@/lib/format";

/** Demonstration IBAN: this environment does not collect real funds. */
export const DEMO_IBAN = "LU28 0019 4006 4475 0000";
export const DEMO_BIC = "BCEELULL";

export function SettlementInstructions({
  amountDue,
  currency,
  orderRef,
  className,
}: {
  amountDue: string;
  currency: string;
  orderRef: string;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Settlement instructions"
        description="Pay by bank transfer. Use the order reference so the payment can be matched."
      />
      <PanelBody className="space-y-4">
        <KeyValueList
          items={[
            {
              label: "Amount due",
              value: (
                <span className="text-base font-semibold">
                  {formatMoney(amountDue, currency)}
                </span>
              ),
              hint: "Exact amount, fees included",
            },
            {
              label: "Payment reference",
              value: <HashValue value={orderRef} full />,
            },
            { label: "Beneficiary", value: "Tooken Escrow S.A. (demo)" },
            {
              label: "IBAN",
              value: <HashValue value={DEMO_IBAN} full />,
              hint: "Demonstration account",
            },
            { label: "BIC", value: DEMO_BIC, mono: true },
          ]}
        />
        <div className="flex gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs text-cyan-900">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>
            Demonstration environment: these bank details are illustrative and
            must not be used for a real transfer. Payments are confirmed by the
            operations team in the back office.
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}
