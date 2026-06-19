"use client";

import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { StockComparison } from "@/components/stock-comparison";
import { Disclaimer } from "@/components/alert";

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-background">
      <TopHeader />
      <main className="container py-4 sm:py-6 pb-24 md:pb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Kembali ke Beranda">
            <Button variant="ghost" size="sm" className="min-h-9">
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
              <span className="hidden sm:inline">Beranda</span>
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Scale className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden />
            Bandingkan Saham
          </h1>
        </div>

        <p className="max-w-2xl text-sm text-muted-foreground px-1">
          Bandingkan 2-3 saham IDX side-by-side: harga, valuation (P/E, P/B),
          profitabilitas (ROE, margin), dividen, pertumbuhan, RSI, MACD, dan
          performa historis. Pilih saham yang ingin dibandingkan, lalu lihat
          perbandingan otomatis di bawah.
        </p>

        <StockComparison />

        <Disclaimer />
      </main>
    </div>
  );
}
