"use client";

import { Blocks, Coins, Fingerprint } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdentityConsole } from "./_components/identity-console";
import { InitWizard } from "./_components/init-wizard";
import { TokenConsole } from "./_components/token-console";
import { TrexSuiteLookup } from "./_components/trex-suite";

export default function PlatformPage() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedVisited, setAdvancedVisited] = useState(false);
  const [section, setSection] = useState("init");

  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="Blockchain & platform"
        description="Inspect the ERC-3643 (T-REX) suite. Exceptional operations are reserved for administrators."
        breadcrumbs={[
          { label: "Back office", href: "/admin" },
          { label: "Blockchain platform" },
        ]}
      />
      <div className="space-y-6">
        <TrexSuiteLookup />

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            aria-expanded={advancedOpen}
            aria-controls="advanced-operations"
            onClick={() => {
              setAdvancedVisited(true);
              setAdvancedOpen((open) => !open);
            }}
          >
            {advancedOpen ? "Close advanced operations" : "Advanced operations"}
          </Button>
          <section
            id="advanced-operations"
            aria-label="Advanced operations"
            hidden={!advancedOpen}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Expert operations can submit blockchain transactions. Verify the
              target and the current deployment state independently before
              proceeding. Inputs and results remain available while you switch
              sections or close this mode during this visit.
            </p>
            {advancedVisited ? (
              <Tabs
                value={section}
                onValueChange={setSection}
                className="space-y-4"
              >
                <p className="text-xs text-muted-foreground sm:hidden">
                  Scroll to see all operation sections.
                </p>
                <div className="-mx-1 overflow-x-auto px-1">
                  <TabsList aria-label="Advanced operation sections">
                    <TabsTrigger value="init" className="gap-1.5">
                      <Blocks className="size-4" aria-hidden /> Initialisation
                    </TabsTrigger>
                    <TabsTrigger value="identity" className="gap-1.5">
                      <Fingerprint className="size-4" aria-hidden /> Identity &
                      claims
                    </TabsTrigger>
                    <TabsTrigger value="tokens" className="gap-1.5">
                      <Coins className="size-4" aria-hidden /> Tokens
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="init"
                  forceMount
                  hidden={section !== "init"}
                  className="mt-0"
                >
                  <InitWizard />
                </TabsContent>
                <TabsContent
                  value="identity"
                  forceMount
                  hidden={section !== "identity"}
                  className="mt-0"
                >
                  <IdentityConsole />
                </TabsContent>
                <TabsContent
                  value="tokens"
                  forceMount
                  hidden={section !== "tokens"}
                  className="mt-0"
                >
                  <TokenConsole />
                </TabsContent>
              </Tabs>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
