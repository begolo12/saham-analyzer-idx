import { PageLoadingSkeleton } from "@/components/lazy-load";

/**
 * Next.js App Router loading fallback for the Screener page.
 * Automatically shown while the page component is streaming.
 */
export default function ScreenerLoading() {
  return <PageLoadingSkeleton />;
}
