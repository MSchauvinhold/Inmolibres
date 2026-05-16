import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MascotaKai } from "@/components/marketplace/MascotaKai";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background-mp)" }}>
      <MarketplaceHeader />
      {children}
      <MarketplaceFooter />
      <MascotaKai />
    </div>
  );
}
