"use client";

import { useEffect } from "react";
import { TookenLoader } from "@/components/app/tooken-loader";
import { useSession } from "@/lib/auth/session-context";

export default function LogoutPage() {
  const { signOut } = useSession();

  useEffect(() => {
    signOut();
    window.location.replace("/");
  }, [signOut]);

  return (
    <output className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink text-sm text-white/70">
      <TookenLoader size={56} /> Signing out…
    </output>
  );
}
