"use client";

import { Blocks, Coins, Fingerprint } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdentityConsole } from "./_components/identity-console";
import { InitWizard } from "./_components/init-wizard";
import { TokenConsole } from "./_components/token-console";
import { TrexSuiteLookup } from "./_components/trex-suite";

export default function PlatformPage() {
  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="Blockchain & platform"
        description="Operate the ERC-3643 (T-REX) infrastructure: platform bootstrap, investor identities and claims, share tokens."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Blockchain platform" },
        ]}
      />
      <Tabs defaultValue="init" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList aria-label="Platform console sections">
            <TabsTrigger value="init" className="gap-1.5">
              <Blocks className="size-4" aria-hidden /> Initialisation
            </TabsTrigger>
            <TabsTrigger value="identity" className="gap-1.5">
              <Fingerprint className="size-4" aria-hidden /> Identity & claims
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-1.5">
              <Coins className="size-4" aria-hidden /> Tokens
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="init" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <InitWizard />
            <div className="xl:sticky xl:top-6 xl:self-start">
              <TrexSuiteLookup />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="identity" className="mt-0">
          <IdentityConsole />
        </TabsContent>
        <TabsContent value="tokens" className="mt-0">
          <TokenConsole />
        </TabsContent>
      </Tabs>
    </>
  );
}
