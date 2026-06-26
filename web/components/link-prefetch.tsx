"use client";

import { useEffect, useCallback } from "react";

/**
 * Utility to prefetch links on hover/touch for faster navigation.
 *
 * Attach to the root layout or a container. It listens for mouseenter
 * and touchstart on <a> elements and prefetches the linked page.
 *
 * Usage: mount <LinkPrefetch /> once in the root layout.
 */
export function LinkPrefetch() {
  const prefetch = useCallback((href: string) => {
    if (typeof window === "undefined") return;
    // Only prefetch same-origin navigation links
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      // Use Next.js router prefetch via a dynamic link element
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url.pathname;
      link.as = "document";
      document.head.appendChild(link);

      // Clean up after a while
      setTimeout(() => {
        try {
          document.head.removeChild(link);
        } catch {
          // already removed
        }
      }, 30000);
    } catch {
      // invalid URL, skip
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleEvent = (e: Event) => {
      const el = e.target as Node;
      if (!el || el.nodeType !== 1) return; // not an element
      const target = (el as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href) prefetch(href);
    };

    // Use mouseenter for desktop, touchstart for mobile
    document.addEventListener("mouseenter", handleEvent, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchstart", handleEvent, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("mouseenter", handleEvent, {
        capture: true,
      });
      document.removeEventListener("touchstart", handleEvent, {
        capture: true,
      });
    };
  }, [prefetch]);

  return null;
}
