"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "outlined" | "elevated";
}>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: [
        "bg-card text-card-foreground",
        "border border-border/50",
        "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
        "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        "hover:shadow-[10px_10px_20px_rgba(0,0,0,0.12),-10px_-10px_20px_rgba(255,255,255,0.8)]",
        "dark:hover:shadow-[10px_10px_20px_rgba(0,0,0,0.4),-10px_-10px_20px_rgba(255,255,255,0.06)]",
        "hover:-translate-y-[2px]",
      ],
      outlined: [
        "bg-card text-card-foreground",
        "border-2 border-border",
        "shadow-[4px_4px_8px_rgba(0,0,0,0.06),-4px_-4px_8px_rgba(255,255,255,0.5)]",
        "dark:shadow-[4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.04)]",
      ],
      elevated: [
        "bg-card text-card-foreground",
        "border border-border/30",
        "shadow-[12px_12px_24px_rgba(0,0,0,0.12),-12px_-12px_24px_rgba(255,255,255,0.8)]",
        "dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.06)]",
        "hover:shadow-[14px_14px_28px_rgba(0,0,0,0.14),-14px_-14px_28px_rgba(255,255,255,0.9)]",
        "dark:hover:shadow-[14px_14px_28px_rgba(0,0,0,0.5),-14px_-14px_28px_rgba(255,255,255,0.07)]",
        "hover:-translate-y-[2px]",
      ],
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl",
          "transition-all duration-200 ease-smooth",
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

/**
 * InteractiveCard — Card with subtle hover lift + press feedback.
 * Use for clickable/navigable cards.
 */
const InteractiveCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl",
        "bg-card text-card-foreground",
        "border border-border/50",
        "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
        "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        "hover:shadow-[10px_10px_20px_rgba(0,0,0,0.12),-10px_-10px_20px_rgba(255,255,255,0.8)]",
        "dark:hover:shadow-[10px_10px_20px_rgba(0,0,0,0.4),-10px_-10px_20px_rgba(255,255,255,0.06)]",
        "hover:-translate-y-[2px]",
        "active:translate-y-0",
        "active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.3)]",
        "dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]",
        "transition-all duration-200 ease-smooth",
        "cursor-pointer",
        className,
      )}
      {...props}
    />
  ),
);
InteractiveCard.displayName = "InteractiveCard";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, InteractiveCard, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
