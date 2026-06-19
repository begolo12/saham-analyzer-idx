"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff, RefreshCw, Home, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OfflinePage() {
  const [autoRetried, setAutoRetried] = useState(false);

  // Auto-reload when back online
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      if (!autoRetried) {
        setAutoRetried(true);
        window.location.reload();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [autoRetried]);

  const isOnline =
    typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <div className="container py-12 max-w-lg pb-24 md:pb-12">
      <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-background dark:from-amber-700/10">
        <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-700/20 mb-4">
          <WifiOff className="h-10 w-10 text-amber-600" aria-hidden />
        </div>
        <h1 className="text-2xl font-black mb-2">Tidak Ada Koneksi</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Kamu sedang offline. Beberapa fitur tidak tersedia, tapi halaman
          yang sudah pernah dibuka masih bisa diakses.
        </p>

        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground mb-6"
        >
          <Wifi
            className="h-3 w-3"
            aria-hidden
            strokeDasharray={isOnline ? "0" : "4 2"}
          />
          <span>{isOnline ? "Menyambungkan ulang..." : "Menunggu koneksi"}</span>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => window.location.reload()}
            className="min-h-11 w-full"
            aria-label="Coba lagi memuat halaman"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
            Coba Lagi
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/" aria-label="Kembali ke Beranda">
              <Button variant="outline" className="min-h-11 w-full">
                <Home className="h-4 w-4 mr-1" aria-hidden />
                Beranda
              </Button>
            </Link>
            <Link href="/portfolio" aria-label="Buka Portfolio">
              <Button variant="outline" className="min-h-11 w-full">
                <Briefcase className="h-4 w-4 mr-1" aria-hidden />
                Portfolio
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-6 italic">
          💡 Data tersimpan lokal di browser. Transaksi bisa dilakukan
          offline dan akan sync saat online kembali.
        </p>
      </Card>
    </div>
  );
}
