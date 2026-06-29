import { PageLoadingSkeleton } from "@/components/lazy-load";

/**
 * Next.js App Router loading fallback for the Portfolio page.
 * Automatically shown while the page component is streaming.
 */
export default function PortfolioLoading() {
  return <PageLoadingSkeleton />;
}
