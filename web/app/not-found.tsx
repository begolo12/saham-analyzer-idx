import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* 404 Number */}
        <div
          className="mx-auto w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%)",
            boxShadow:
              "8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.6)",
          }}
        >
          <span
            className="text-4xl font-black text-blue-500"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.06)" }}
          >
            404
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.05)" }}
          >
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
            <br />
            Periksa kembali alamat URL atau gunakan pencarian.
          </p>
        </div>

        {/* Illustrative tip */}
        <div
          className="rounded-2xl p-4 text-left"
          style={{
            background: "linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)",
            boxShadow:
              "inset 4px 4px 8px rgba(0,0,0,0.03), inset -4px -4px 8px rgba(255,255,255,0.5)",
          }}
        >
          <p className="text-xs text-blue-700">
            💡 <strong>Tips:</strong> Untuk analisa saham, kunjungi halaman{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">
              /stock/BBCA
            </code>{" "}
            atau cari ticker IDX favorit Anda.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(145deg, #a78bfa 0%, #8b5cf6 100%)",
              boxShadow:
                "6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.4)",
            }}
          >
            <Home className="h-4 w-4" />
            Kembali ke Beranda
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(145deg, #e8e0f0 0%, #d4c5e2 100%)",
              boxShadow:
                "6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.5)",
            }}
          >
            <Search className="h-4 w-4" />
            Cari Saham
          </Link>
        </div>
      </div>
    </div>
  );
}
