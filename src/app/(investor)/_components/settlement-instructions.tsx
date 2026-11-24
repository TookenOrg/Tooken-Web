import { Info } from "lucide-react";
import { HashValue } from "@/components/app/hash-value";
import { KeyValueList } from "@/components/app/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { formatRecordedMoney } from "@/lib/format";

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
  const isDemo = process.env.DEMO_MODE === "true";
  return (
    <Panel className={className}>
      <PanelHeader
        title="Settlement instructions"
        description="The exact amount and order reference are shown below."
      />
      <PanelBody className="space-y-4">
        <KeyValueList
          items={[
            {
              label: "Amount due",
              value: (
                <span className="text-base font-semibold">
                  {formatRecordedMoney(amountDue, currency)}
                </span>
              ),
              hint: "Exact amount, fees included",
            },
            {
              label: "Payment reference",
              value: <HashValue value={orderRef} full />,
            },
            ...(isDemo
              ? [
                { label: "Beneficiary", value: "Tooken Escrow S.A. (demo)" },
                {
                  label: "IBAN",
                  value: <HashValue value={DEMO_IBAN} full />,
                  hint: "Demonstration account",
                },
                { label: "BIC", value: DEMO_BIC, mono: true },
              ]
              : []),
          ]}
        />
        <div className="flex gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs text-cyan-900">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>
            {isDemo
              ? "Demonstration environment: these bank details are illustrative and must not be used for a real transfer."
              : "Bank details are unavailable. Do not send a transfer until you have received verified payment instructions."}
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}
