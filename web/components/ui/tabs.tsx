"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
} | null>(null);

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
    onValueChange: (value: string) => void;
    defaultValue?: string;
  }
>(({ className, value, onValueChange, children, ...props }, ref) => {
  const baseId = React.useId();

  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex h-11 items-center justify-start rounded-xl bg-muted p-1 text-muted-foreground overflow-x-auto no-scrollbar w-full sm:w-auto",
        className,
      )}
      role="tablist"
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, onClick, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = ctx.value === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      ctx.onValueChange(value);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      ctx.onValueChange(value);
    }
  };

  return (
    <button
      ref={ref}
      id={tabId}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:text-foreground/80",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");

  if (ctx.value !== value) return null;

  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  return (
    <div
      ref={ref}
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className={cn("mt-4 ring-offset-background focus-visible:outline-none animate-fade-in", className)}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
