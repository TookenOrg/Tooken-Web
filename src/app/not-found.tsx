import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-white/60">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button
        asChild
        className="mt-8 bg-brand text-brand-foreground hover:bg-brand-light"
      >
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
