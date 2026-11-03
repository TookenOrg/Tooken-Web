"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/session-context";

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useSession();

  useEffect(() => {
    signOut();
    router.replace("/sign-in");
  }, [signOut, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink text-white/70">
      <Loader2 className="mr-2 size-4 animate-spin" /> Signing out…
    </div>
  );
}
