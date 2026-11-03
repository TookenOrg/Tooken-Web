"use client";

import { useMutation } from "@tanstack/react-query";
import { Coins, Flame, ScanSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormField } from "@/components/app/form-field";
import { HashValue } from "@/components/app/hash-value";
import { Panel, PanelBody, PanelHeader } from "@/components/app/panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { contractApi } from "@/lib/api/endpoints";
import { useRealEstates, useTokenInfos } from "@/lib/api/hooks";
import type { BurnTokenRequest, CreateTokenRequest } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { ResultPanel } from "./result-panel";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const POSITIVE_INT = /^[1-9]\d*$/;

export function TokenConsole() {
  const estates = useRealEstates();
  const tokens = useMemo(
    () =>
      (estates.data ?? []).flatMap((e) =>
        e.contract_address
          ? [{ address: e.contract_address, label: e.title ?? `#${e.id}` }]
          : [],
      ),
    [estates.data],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <CreateTokenForm />
        <TokenInspector tokens={tokens} />
      </div>
      <BurnForm tokens={tokens} />
    </div>
  );
}

type TokenOption = { address: string; label: string };

function TokenPicker({
  tokens,
  onPick,
  id,
}: {
  tokens: TokenOption[];
  onPick: (address: string) => void;
  id: string;
}) {
  if (!tokens.length) return null;
  return (
    <Select value="" onValueChange={onPick}>
      <SelectTrigger
        id={id}
        className="w-full sm:w-56"
        aria-label="Pick a token from the asset catalogue"
      >
        <SelectValue placeholder="Pick from assets…" />
      </SelectTrigger>
      <SelectContent>
        {tokens.map((t) => (
          <SelectItem key={t.address} value={t.address}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- Token factory -----------------------------------------------------------

type TokenForm = {
  tokenName: string;
  symbol: string;
  nbDecimal: string;
  totalShares: string;
  maxSharesPerInvestor: string;
};

function validateToken(v: TokenForm): Partial<Record<keyof TokenForm, string>> {
  const e: Partial<Record<keyof TokenForm, string>> = {};
  if (!v.tokenName.trim()) e.tokenName = "Required.";
  if (!/^[A-Z0-9]{2,11}$/.test(v.symbol))
    e.symbol = "2 to 11 upper-case letters or digits.";
  const dec = Number(v.nbDecimal);
  if (!/^\d+$/.test(v.nbDecimal) || dec > 18) e.nbDecimal = "0 to 18.";
  if (!POSITIVE_INT.test(v.totalShares))
    e.totalShares = "A positive whole number.";
  if (!POSITIVE_INT.test(v.maxSharesPerInvestor))
    e.maxSharesPerInvestor = "A positive whole number.";
  else if (
    !e.totalShares &&
    BigInt(v.maxSharesPerInvestor) > BigInt(v.totalShares)
  )
    e.maxSharesPerInvestor = "Cannot exceed the total shares.";
  return e;
}

function CreateTokenForm() {
  const [form, setForm] = useState<TokenForm>({
    tokenName: "",
    symbol: "",
    nbDecimal: "18",
    totalShares: "",
    maxSharesPerInvestor: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof TokenForm, string>>
  >({});
  const [pendingBody, setPendingBody] = useState<CreateTokenRequest | null>(
    null,
  );
  const mutation = useMutation({
    mutationFn: (body: CreateTokenRequest) => contractApi.createToken(body),
  });

  const set =
    (k: keyof TokenForm, transform?: (s: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({
        ...f,
        [k]: transform ? transform(e.target.value) : e.target.value,
      }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateToken(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setPendingBody({
      tokenName: form.tokenName.trim(),
      symbol: form.symbol,
      nbDecimal: Number(form.nbDecimal),
      totalShares: form.totalShares,
      maxSharesPerInvestor: form.maxSharesPerInvestor,
    });
  };

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Coins className="size-4 text-muted-foreground" aria-hidden />
            Token factory
          </span>
        }
        description="Deploys a standalone ERC-3643 share token with supply and holding limits. Assets normally get their token when published."
      />
      <PanelBody className="space-y-4">
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Token name"
              htmlFor="token-name"
              required
              error={errors.tokenName}
              className="sm:col-span-2"
            >
              <Input
                id="token-name"
                value={form.tokenName}
                onChange={set("tokenName")}
                placeholder="e.g. Tooken Harbour Lofts"
                aria-invalid={!!errors.tokenName}
              />
            </FormField>
            <FormField
              label="Symbol"
              htmlFor="token-symbol"
              required
              error={errors.symbol}
            >
              <Input
                id="token-symbol"
                value={form.symbol}
                onChange={set("symbol", (s) => s.toUpperCase())}
                placeholder="TKHL"
                className="font-mono"
                maxLength={11}
                aria-invalid={!!errors.symbol}
              />
            </FormField>
            <FormField
              label="Decimals"
              htmlFor="token-decimals"
              required
              error={errors.nbDecimal}
            >
              <Input
                id="token-decimals"
                inputMode="numeric"
                value={form.nbDecimal}
                onChange={set("nbDecimal")}
                className="tabular"
                aria-invalid={!!errors.nbDecimal}
              />
            </FormField>
            <FormField
              label="Total shares"
              htmlFor="token-total"
              required
              error={errors.totalShares}
              hint="Supply cap enforced on-chain."
            >
              <Input
                id="token-total"
                inputMode="numeric"
                value={form.totalShares}
                onChange={set("totalShares")}
                placeholder="1500"
                className="tabular"
                aria-invalid={!!errors.totalShares}
              />
            </FormField>
            <FormField
              label="Max shares per investor"
              htmlFor="token-max"
              required
              error={errors.maxSharesPerInvestor}
              hint="Holding limit per identity."
            >
              <Input
                id="token-max"
                inputMode="numeric"
                value={form.maxSharesPerInvestor}
                onChange={set("maxSharesPerInvestor")}
                placeholder="50"
                className="tabular"
                aria-invalid={!!errors.maxSharesPerInvestor}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            Deploy token
          </Button>
        </form>
        <ResultPanel
          data={mutation.isSuccess ? mutation.data : undefined}
          error={mutation.error}
        />
      </PanelBody>
      <ConfirmDialog
        open={!!pendingBody}
        onOpenChange={(o) => !o && setPendingBody(null)}
        title="Deploy a new token?"
        description={
          pendingBody
            ? `${pendingBody.tokenName} (${pendingBody.symbol}) · ${formatNumber(pendingBody.totalShares)} shares, max ${formatNumber(pendingBody.maxSharesPerInvestor)} per investor, ${pendingBody.nbDecimal} decimals. Contracts are deployed on-chain and cannot be removed.`
            : undefined
        }
        confirmLabel="Deploy token"
        pending={mutation.isPending}
        onConfirm={() =>
          pendingBody &&
          mutation.mutate(pendingBody, {
            onSettled: () => setPendingBody(null),
          })
        }
      />
    </Panel>
  );
}

// --- Inspector ----------------------------------------------------------------

function TokenInspector({ tokens }: { tokens: TokenOption[] }) {
  const [draft, setDraft] = useState("");
  const [address, setAddress] = useState<string | undefined>();
  const [error, setError] = useState<string>();
  const infos = useTokenInfos(address);

  const inspect = (value: string) => {
    const v = value.trim();
    if (!ADDRESS.test(v)) {
      setError("Enter a 0x-prefixed 40-character contract address.");
      return;
    }
    setError(undefined);
    setDraft(v);
    setAddress(v);
  };

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <ScanSearch className="size-4 text-muted-foreground" aria-hidden />
            Token inspector
          </span>
        }
        description="Reads the on-chain record of a share token."
      />
      <PanelBody className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            inspect(draft);
          }}
          noValidate
        >
          <FormField
            label="Token contract address"
            htmlFor="inspect-address"
            error={error}
          >
            <Input
              id="inspect-address"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="0x…"
              className="font-mono text-xs"
              aria-invalid={!!error}
            />
          </FormField>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant="outline">
              Inspect
            </Button>
            <TokenPicker
              id="inspect-pick"
              tokens={tokens}
              onPick={(a) => inspect(a)}
            />
          </div>
        </form>
        {address ? (
          infos.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : infos.isError ? (
            <ResultPanel error={infos.error} />
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Contract <HashValue value={address} />
              </div>
              <ResultPanel
                data={infos.data ?? ""}
                title="Token information"
                emptyLabel="On-chain details unavailable: the backend does not expose token information yet."
              />
            </>
          )
        ) : null}
      </PanelBody>
    </Panel>
  );
}

// --- Burn -------------------------------------------------------------------

const CONFIRM_WORD = "BURN";

function significantDigits(s: string): number {
  return s
    .replace(/^[-0.]+/, "")
    .replace(".", "")
    .replace(/0+$/, "").length;
}

function BurnForm({ tokens }: { tokens: TokenOption[] }) {
  const [form, setForm] = useState({ token: "", amount: "", to: "" });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});
  const [pendingBody, setPendingBody] = useState<BurnTokenRequest | null>(null);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState(false);
  const mutation = useMutation({
    mutationFn: (body: BurnTokenRequest) => contractApi.burn(body),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = form.amount.trim();
    const next: Partial<Record<keyof typeof form, string>> = {};
    if (!ADDRESS.test(form.token.trim()))
      next.token = "Enter a valid token contract address.";
    if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0)
      next.amount = "A positive amount, in tokens.";
    else if (significantDigits(amount) > 15)
      next.amount = "At most 15 significant digits.";
    if (!ADDRESS.test(form.to.trim()))
      next.to = "Enter a valid holder wallet address.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setTyped("");
    setTypedError(false);
    setPendingBody({
      tokenContractAddress: form.token.trim(),
      amount: Number(amount),
      to: form.to.trim(),
    });
  };

  return (
    <Panel className="border-red-200">
      <PanelHeader
        title={
          <span className="flex items-center gap-2 text-red-700">
            <Flame className="size-4" aria-hidden />
            Burn tokens
          </span>
        }
        description="Destroys tokens held by a wallet, e.g. after a redemption. Irreversible."
      />
      <PanelBody className="space-y-4">
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <FormField
              label="Token contract"
              htmlFor="burn-token"
              required
              error={errors.token}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="burn-token"
                  value={form.token}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, token: e.target.value }))
                  }
                  placeholder="0x…"
                  className="font-mono text-xs"
                  aria-invalid={!!errors.token}
                />
                <TokenPicker
                  id="burn-pick"
                  tokens={tokens}
                  onPick={(a) => setForm((f) => ({ ...f, token: a }))}
                />
              </div>
            </FormField>
            <FormField
              label="Amount"
              htmlFor="burn-amount"
              required
              error={errors.amount}
              hint="In tokens, not in base units."
            >
              <Input
                id="burn-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="10"
                className="tabular"
                aria-invalid={!!errors.amount}
              />
            </FormField>
            <FormField
              label="Holder wallet"
              htmlFor="burn-to"
              required
              error={errors.to}
              className="md:col-span-2"
            >
              <Input
                id="burn-to"
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                placeholder="0x…"
                className="font-mono text-xs"
                aria-invalid={!!errors.to}
              />
            </FormField>
          </div>
          <Button
            type="submit"
            variant="destructive"
            disabled={mutation.isPending}
          >
            <Flame /> Review burn
          </Button>
        </form>
        {mutation.isSuccess ? (
          <p className="text-xs text-muted-foreground">
            Request accepted (202): the burn transaction is processed in the
            background.
          </p>
        ) : null}
        <ResultPanel
          data={mutation.isSuccess ? (mutation.data ?? null) : undefined}
          error={mutation.error}
        />
      </PanelBody>
      <ConfirmDialog
        open={!!pendingBody}
        onOpenChange={(o) => !o && setPendingBody(null)}
        title="Burn tokens permanently?"
        description={
          <p>
            This writes to an immutable ledger and cannot be reversed. Make sure
            the redemption has been settled off-chain first.
          </p>
        }
        confirmLabel="Burn tokens"
        destructive
        pending={mutation.isPending}
        onConfirm={() => {
          if (!pendingBody) return;
          if (typed !== CONFIRM_WORD) {
            setTypedError(true);
            return;
          }
          mutation.mutate(pendingBody, {
            onSettled: () => setPendingBody(null),
          });
        }}
      >
        {pendingBody ? (
          <div className="space-y-3">
            <Alert variant="destructive">
              <Flame />
              <AlertTitle className="tabular">
                {formatNumber(pendingBody.amount, 18)} tokens
              </AlertTitle>
              <AlertDescription className="space-y-1 text-xs">
                <span className="flex flex-wrap items-center gap-1.5">
                  Token <HashValue value={pendingBody.tokenContractAddress} />
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  Holder <HashValue value={pendingBody.to} />
                </span>
              </AlertDescription>
            </Alert>
            <FormField
              label={
                <>
                  Type <span className="font-mono">{CONFIRM_WORD}</span> to
                  confirm
                </>
              }
              htmlFor="burn-confirm"
              error={
                (typedError || typed) && typed !== CONFIRM_WORD
                  ? `Type ${CONFIRM_WORD} in capitals.`
                  : undefined
              }
            >
              <Input
                id="burn-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="font-mono"
              />
            </FormField>
          </div>
        ) : null}
      </ConfirmDialog>
    </Panel>
  );
}
