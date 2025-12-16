import { MarketingNavbar } from '@/components/layout/marketing-navbar';
import { MarketingFooter } from '@/components/layout/marketing-footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNavbar />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
