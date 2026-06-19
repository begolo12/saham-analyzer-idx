"use client";

import { useCompactMode } from "@/lib/compact-mode";
import { Maximize2, Minimize2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Compact Mode Toggle — placed in Settings page.
 * When ON: smaller fonts + tighter padding (controlled via .compact class on html).
 */
export function CompactModeToggle() {
  const { compact, setCompact, mounted } = useCompactMode();

  if (!mounted) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        {compact ? (
          <Minimize2 className="h-5 w-5 text-primary" />
        ) : (
          <Maximize2 className="h-5 w-5 text-primary" />
        )}
        <h2 className="font-bold text-lg">Mode Tampilan</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Pilih tampilan yang lebih ringkas (compact) atau lebih longgar (normal).
        Compact cocok untuk layar kecil atau informasi padat.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setCompact(false)}
          className={cn(
            "p-3 rounded-lg border-2 transition-colors text-left",
            !compact
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent/50",
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Maximize2 className="h-4 w-4" />
            <span className="font-bold text-sm">Normal</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Spacious, font lebih besar
          </div>
        </button>
        <button
          onClick={() => setCompact(true)}
          className={cn(
            "p-3 rounded-lg border-2 transition-colors text-left",
            compact
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent/50",
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Minimize2 className="h-4 w-4" />
            <span className="font-bold text-sm">Compact</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Padat, hemat ruang vertikal
          </div>
        </button>
      </div>
    </Card>
  );
}
