import Link from "next/link";
import {
  Search,
  Star,
  TrendingUp,
  Newspaper,
  PieChart,
  Brain,
  Target,
  ChevronRight,
  Activity,
} from "lucide-react";
import { TopHeader } from "@/components/top-header";
import { StockSearch } from "@/components/stock-search";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/alert";
import { POPULAR_STOCKS, getStocksBySector, SECTORS } from "@/lib/popular-stocks";

export default function HomePage() {
  const stocksBySector = getStocksBySector();
  const trendingStocks = POPULAR_STOCKS.slice(0, 6);

  const features = [
    {
      icon: Activity,
      title: "Analisa Teknikal",
      desc: "RSI, MACD, MA, Bollinger Bands",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: PieChart,
      title: "Analisa Fundamental",
      desc: "P/E, ROE, DER, Profit Margin",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Brain,
      title: "Behavioral AI",
      desc: "Akumulasi/Distribusi, Smart Money",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Newspaper,
      title: "Sentimen Berita",
      desc: "Multi-source ID + NLP Bahasa Indonesia",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Target,
      title: "Rekomendasi Cerdas",
      desc: "Buy/Hold/Sell + Entry Zone + Target + SL",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Star,
      title: "Watchlist",
      desc: "Simpan saham favoritmu",
      color: "from-amber-500 to-yellow-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="container py-6 sm:py-10">
        {/* Hero */}
        <section className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Real-time data dari Yahoo Finance
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3">
            <span className="bg-gradient-to-br from-bull-500 via-primary to-purple-600 bg-clip-text text-transparent">
              Saham Analyzer
            </span>
            <br />
            <span className="text-foreground">IDX</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-6 px-4">
            Analisa saham Indonesia dengan rekomendasi{" "}
            <span className="font-semibold text-foreground">Buy / Hold / Sell</span>{" "}
            berbasis multi-signal.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto px-4">
            <StockSearch />
          </div>
        </section>

        {/* Disclaimer */}
        <Disclaimer />

        {/* Features */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 px-1">🎯 Fitur Unggulan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card
                  key={i}
                  className="p-4 card-hover overflow-hidden relative"
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${f.color} opacity-10 rounded-full blur-2xl`} />
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${f.color} mb-3 shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-base mb-1">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Trending */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-bull-500" />
              Saham Trending
            </h2>
            <Link href="/watchlist">
              <Button variant="ghost" size="sm" className="text-xs">
                Lihat Watchlist
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {trendingStocks.map((stock) => (
              <Link key={stock.code} href={`/stock/${stock.code}`}>
                <Card className="p-3 card-hover cursor-pointer">
                  <div className="font-bold text-sm">{stock.code}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {stock.name}
                  </div>
                  <Badge variant="outline" className="mt-2 text-[9px] px-1.5 py-0">
                    {stock.sector}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* By Sector */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 px-1">📊 Jelajahi per Sektor</h2>
          <div className="space-y-3">
            {SECTORS.map((sector) => {
              const stocks = stocksBySector[sector] || [];
              return (
                <Card key={sector} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{sector}</h3>
                    <span className="text-xs text-muted-foreground">
                      {stocks.length} saham
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stocks.map((s) => (
                      <Link key={s.code} href={`/stock/${s.code}`}>
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
                        >
                          {s.code}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Accuracy Disclaimer */}
        <section className="mb-8">
          <Card className="p-5 sm:p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2">
              📐 Tentang Akurasi
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>Tidak ada sistem di dunia</strong> yang menjamin akurasi prediksi saham
              90%+ secara konsisten. Aplikasi ini memberikan <strong>reasoning multi-signal</strong>{" "}
              dengan <strong>confidence score</strong> yang jujur. Gunakan sebagai alat bantu,
              bukan jaminan profit. Selalu DYOR dan kelola risiko Anda.
            </p>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t pt-6 pb-4 text-center text-xs text-muted-foreground">
          <p>📊 Data: Yahoo Finance • Sentimen: Google News</p>
          <p className="mt-1">© 2026 Saham Analyzer IDX</p>
        </footer>
      </main>
    </div>
  );
}
