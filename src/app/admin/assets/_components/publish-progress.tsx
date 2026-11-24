"use client";

import { Panel } from "@/components/app/panel";
import { TookenLoader } from "@/components/app/tooken-loader";

export function PublishProgress() {
  return (
    <Panel className="border-amber-200">
      <output className="flex items-start gap-3 p-5">
        <TookenLoader size={20} />
        <span>
          <span className="block text-sm font-semibold text-ink">
            Publication request in progress
          </span>
          <span className="block text-xs text-muted-foreground">
            The server checks the asset and waits for token deployment.
            Publication is not confirmed until the server responds.
          </span>
        </span>
      </output>
    </Panel>
  );
}
