"use client";

import { useEffect, useState } from "react";
import { Panel, PanelBody } from "@/components/app/panel";
import { TookenLoader } from "@/components/app/tooken-loader";
import { Progress } from "@/components/ui/progress";

const PUBLISH_STEPS = [
  "Checking asset completeness",
  "Deploying ERC-3643 token suite",
  "Binding the token to the asset",
];

export function PublishProgress() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(t);
  }, []);
  const step = elapsed < 8000 ? 0 : elapsed < 45000 ? 1 : 2;
  const pct = Math.min(92, (elapsed / 60000) * 92);
  return (
    <Panel className="border-amber-200">
      <output aria-live="polite" className="block">
        <PanelBody className="space-y-3">
          <div className="flex items-center gap-3">
            <TookenLoader size={20} />
            <div>
              <p className="text-sm font-semibold text-ink">
                Deploying ERC-3643 token…
              </p>
              <p className="text-xs text-muted-foreground">
                {PUBLISH_STEPS[step]}. Estimated progress; this usually takes
                about a minute. Keep this page open.
              </p>
            </div>
          </div>
          <Progress
            value={pct}
            className="h-1.5 bg-amber-100 [&>div]:bg-brand"
            aria-label="Deployment progress"
          />
        </PanelBody>
      </output>
    </Panel>
  );
}
