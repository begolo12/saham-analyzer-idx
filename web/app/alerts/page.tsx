"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  ArrowLeft,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  History,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  getAlerts,
  removeAlert,
  rearmAlert,
  clearAllAlerts,
  getAlertHistory,
  clearAlertHistory,
  type PriceAlert,
  type AlertHistoryEntry,
  type AlertType,
} from "@/lib/price-alerts";
import { formatIDR, cn } from "@/lib/utils";
import { toast } from "sonner";
import { MobileAppBar } from "@/components/mobile-app-bar";

type TabType = "active" | "history";

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="page-main container"><div className="shimmer h-32 w-full rounded-2xl" /></div>}>
      <AlertsPageContent />
    </Suspense>
  );
}

function AlertsPageContent() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabType>("active");
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");

  useEffect(() => {
    setMounted(true);
    setAlerts(getAlerts());
    setHistory(getAlertHistory());

    const handler = () => {
      setAlerts(getAlerts());
      setHistory(getAlertHistory());
    };
    window.addEventListener("alerts-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("alerts-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const armedAlerts = useMemo(() => alerts.filter((a) => a.status === "armed"), [alerts]);
  const triggeredAlerts = useMemo(() => alerts.filter((a) => a.status === "triggered"), [alerts]);

  const filteredAlerts = useMemo(() => {
    const list = tab === "active" ? alerts : [];
    if (typeFilter === "all") return list;
    return list.filter((a) => a.alertType === typeFilter);
  }, [alerts, tab, typeFilter]);

  const filteredHistory = useMemo(() => {
    if (typeFilter === "all") return history;
    return history.filter((h) => h.alertType === typeFilter);
  }, [history, typeFilter]);

  const handleRemove = (id: string) => {
    removeAlert(id);
    setAlerts(getAlerts());
    toast.success("Alert dihapus");
  };

  const handleRearm = (id: string) => {
    rearmAlert(id);
    setAlerts(getAlerts());
    toast.success("Alert diaktifkan kembali");
  };

  const handleClearAll = () => {
    if (confirm("Hapus semua alert?")) {
      clearAllAlerts();
      setAlerts(getAlerts());
      toast.success("Semua alert dihapus");
    }
  };

  const handleClearHistory = () => {
    if (confirm("Hapus semua riwayat alert?")) {
      clearAlertHistory();
      setHistory(getAlertHistory());
      toast.success("Riwayat alert dihapus");
    }
  };

  const getAlertTypeIcon = (type: AlertType) => {
    switch (type) {
      case "price_above": return <TrendingUp className="h-3.5 w-3.5" />;
      case "price_below": return <TrendingDown className="h-3.5 w-3.5" />;
      case "pct_change": return <Percent className="h-3.5 w-3.5" />;
      case "volume_spike": return <BarChart3 className="h-3.5 w-3.5" />;
      default: return <Bell className="h-3.5 w-3.5" />;
    }
  };

  const getAlertTypeLabel = (type: AlertType) => {
    switch (type) {
      case "price_above": return "Harga Naik";
      case "price_below": return "Harga Turun";
      case "pct_change": return "% Perubahan";
      case "volume_spike": return "Volume Spike";
      default: return "Alert";
    }
  };

  const formatAlertValue = (a: PriceAlert) => {
    switch (a.alertType) {
      case "price_above": return `> ${formatIDR(a.threshold)}`;
      case "price_below": return `< ${formatIDR(a.threshold)}`;
      case "pct_change": return `${a.direction === "above" ? "+" : "-"}${a.threshold}%`;
      case "volume_spike": return `Vol ≥ ${a.volumeMultiplier ?? a.threshold}x`;
      default: return `${a.direction === "above" ? ">" : "<"} ${formatIDR(a.threshold)}`;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="page-main container">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-background">
      <MobileAppBar
        title="Alert Manager"
        subtitle={`${armedAlerts.length} aktif • ${triggeredAlerts.length} triggered`}
        backHref="/watchlist"
      />

      <main className="page-main container space-y-4">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/watchlist" aria-label="Kembali ke Watchlist">
              <Button variant="ghost" size="sm" className="min-h-9">
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Watchlist</span>
              </Button>
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              <Bell className="h-6 w-6 text-amber-500 sm:h-7 sm:w-7" aria-hidden />
              Alert Manager
            </h1>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {alerts.length}
              </Badge>
            )}
          </div>
          {alerts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="min-h-9 text-xs">
              <Trash2 className="mr-1 h-4 w-4" aria-hidden />
              Hapus Semua
            </Button>
          )}
        </div>

        {/* Stats */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <div className="text-2xl font-black text-primary">{armedAlerts.length}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aktif</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-black text-amber-600">{triggeredAlerts.length}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Triggered</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-black text-muted-foreground">{history.length}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Riwayat</div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
          <button
            onClick={() => setTab("active")}
            className={cn(
              "flex-1 rounded-full py-2 text-xs font-bold transition-colors",
              tab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Bell className="h-3.5 w-3.5 inline mr-1" />
            Alert Aktif ({alerts.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn(
              "flex-1 rounded-full py-2 text-xs font-bold transition-colors",
              tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <History className="h-3.5 w-3.5 inline mr-1" />
            Riwayat ({history.length})
          </button>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter className="h-3 w-3" />
            Tipe
          </span>
          {[
            { key: "all" as const, label: "Semua" },
            { key: "price_above" as const, label: "📈 Naik" },
            { key: "price_below" as const, label: "📉 Turun" },
            { key: "pct_change" as const, label: "%" },
            { key: "volume_spike" as const, label: "📊 Volume" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTypeFilter(opt.key)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-colors",
                typeFilter === opt.key
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "active" ? (
          filteredAlerts.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-5 w-5" aria-hidden />}
              title="Belum ada alert"
              description="Pasang alert harga dari halaman watchlist atau detail saham."
              actions={[
                { label: "Ke Watchlist", onClick: () => window.location.href = "/watchlist" },
              ]}
            />
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((a) => (
                <Card
                  key={a.id}
                  className={cn(
                    "p-3",
                    a.status === "triggered" && "border-amber-500/40 bg-amber-50/30 dark:bg-amber-900/10",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                      a.status === "triggered" ? "bg-amber-500/20 text-amber-600" : "bg-primary/10 text-primary",
                    )}>
                      {getAlertTypeIcon(a.alertType ?? "price_above")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/stock/${a.ticker}`} className="font-bold text-sm hover:underline">
                          {a.ticker}
                        </Link>
                        <Badge
                          variant={a.status === "triggered" ? "bull" : "outline"}
                          className="text-[10px]"
                        >
                          {a.status === "triggered" ? "✓ Triggered" : "● Aktif"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {getAlertTypeLabel(a.alertType ?? "price_above")}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-bold tabular-nums">
                        {formatAlertValue(a)}
                      </div>
                      {a.triggeredPrice && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Harga saat trigger: <strong className="text-foreground">{formatIDR(a.triggeredPrice)}</strong>
                        </div>
                      )}
                      {a.note && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 italic">{a.note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.status === "triggered" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRearm(a.id)}
                          title="Aktifkan kembali"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-bear-600"
                        onClick={() => handleRemove(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          filteredHistory.length === 0 ? (
            <EmptyState
              icon={<History className="h-5 w-5" aria-hidden />}
              title="Belum ada riwayat"
              description="Riwayat alert yang sudah triggered akan muncul di sini."
            />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-xs text-muted-foreground">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Hapus Riwayat
                </Button>
              </div>
              {filteredHistory.map((h) => (
                <Card key={h.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                      {getAlertTypeIcon(h.alertType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/stock/${h.ticker}`} className="font-bold text-sm hover:underline">
                          {h.ticker}
                        </Link>
                        <Badge variant="outline" className="text-[10px]">
                          {getAlertTypeLabel(h.alertType)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Target: {formatIDR(h.threshold)} → Harga: <strong className="text-foreground">{formatIDR(h.triggeredPrice)}</strong>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(h.triggeredAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
