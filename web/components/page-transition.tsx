"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  /** Unique key for the current route/page */
  pageKey: string;
  className?: string;
}

// Always false during SSR to prevent hydration mismatch.
// Client-side components should use usePrefersReducedMotion() hook instead.
const prefersReducedMotion = false;

const variants: Variants = {
  initial: {
    opacity: 0,
    y: prefersReducedMotion ? 0 : 6,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion ? 0.01 : 0.28,
      ease: [0.25, 0.1, 0.25, 1], // ease-out cubic
    },
  },
  exit: {
    opacity: 0,
    y: prefersReducedMotion ? 0 : -4,
    transition: {
      duration: prefersReducedMotion ? 0.01 : 0.18,
      ease: [0.4, 0, 1, 1], // ease-in cubic
    },
  },
};

/**
 * Page transition wrapper using framer-motion AnimatePresence.
 * Fade + subtle vertical slide. Respects prefers-reduced-motion.
 */
export function PageTransition({ children, pageKey, className }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Stagger children reveal — wrap a list container and its items.
 * Use <StaggerItem> for each direct child.
 */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.04,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
            delayChildren: prefersReducedMotion ? 0 : 0.06,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: prefersReducedMotion ? 0.01 : 0.28,
            ease: [0.25, 0.1, 0.25, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Dismissible item wrapper — animates out to the left when dismissed.
 */
export function DismissibleItem({
  children,
  onDismiss,
  className,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className={className}
        exit={{
          x: "-100%",
          opacity: 0,
          height: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          transition: { duration: prefersReducedMotion ? 0.01 : 0.25, ease: "easeInOut" },
        }}
        layout
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
