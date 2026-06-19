"use client";

import { useLanguage, SUPPORTED_LANGS } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { lang, setLang, mounted } = useLanguage();

  if (!mounted) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Languages className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">Bahasa / Language</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Pilih bahasa antarmuka. Konten spesifik IDX tetap dalam Bahasa Indonesia.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={cn(
              "p-3 rounded-lg border-2 transition-colors text-left",
              lang === l.code
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/50",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{l.flag}</span>
              <span className="font-bold text-sm">{l.label}</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {l.code.toUpperCase()}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
