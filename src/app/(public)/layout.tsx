import { MvpBanner } from "@/components/app/mvp-banner";
import { PublicFooter } from "@/components/app/public-footer";
import { PublicHeader } from "@/components/app/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <MvpBanner />
      <PublicFooter />
    </div>
  );
}
