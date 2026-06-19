"use client";

import Link from "next/link";
import { Wifi, RefreshCw, Home, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <div className="container py-12 max-w-lg">
      <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-background dark:from-amber-700/10">
        <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-700/20 mb-4">
          <Wifi className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-black mb-2">Tidak Ada Koneksi</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Kamu sedang offline. Beberapa fitur tidak tersedia, tapi halaman
          yang sudah pernah dibuka masih bisa diakses.
        </p>

        <div className="space-y-2">
          <Button onClick={() => location.reload()} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-1" />
                Beranda
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="outline" className="w-full">
                <Briefcase className="h-4 w-4 mr-1" />
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
