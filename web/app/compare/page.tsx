"use client";

import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { StockComparison } from "@/components/stock-comparison";
import { Disclaimer } from "@/components/alert";

export default function ComparePage() {
  return (
    <div className="app-shell min-h-screen bg-background">
      <TopHeader />
      <main className="page-main container space-y-4">
        <div className="mobile-topbar md:hidden">
          <div className="mobile-topbar__inner">
            <div className="min-w-0 flex-1">
              <div className="mobile-topbar__title flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" aria-hidden />
                Bandingkan Saham
              </div>
              <div className="mobile-topbar__subtitle">Mode mobile fokus 2 saham, lalu baca winner per kategori</div>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/" aria-label="Kembali ke Beranda">
            <Button variant="ghost" size="sm" className="min-h-9">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Beranda</span>
            </Button>
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
            <Scale className="h-6 w-6 text-primary sm:h-7 sm:w-7" aria-hidden />
            Bandingkan Saham
          </h1>
        </div>

        <p className="max-w-2xl px-1 text-sm text-muted-foreground">
          Bandingkan 2-3 saham IDX tanpa layout tabel yang sempit di mobile. Fokuskan keputusan per kategori: value, growth, technical, dan risk.
        </p>

        <div className="page-hero-card p-4 md:hidden">
          <div className="page-eyebrow">Mobile compare</div>
          <div className="mt-1 text-sm font-bold">Builder sticky + winner summary + cards per kategori</div>
          <div className="mt-1 text-xs text-muted-foreground">Lebih cepat dibaca di layar kecil dibanding matrix tabel lama.</div>
        </div>

        <div className="page-section-heading">
          <div>
            <div className="page-section-title">Bandingkan dan putuskan</div>
            <div className="page-section-subtitle">Tambahkan saham, lalu lihat pemenang tiap kategori utama</div>
          </div>
        </div>

        <StockComparison />

        <Disclaimer />
      </main>
    </div>
  );
}
