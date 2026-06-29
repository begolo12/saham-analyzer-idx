"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

export default function StockErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Stock Page Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div
          className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #fde68a 0%, #fbbf24 100%)",
            boxShadow:
              "8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.6)",
          }}
        >
          <AlertTriangle className="h-10 w-10 text-amber-600" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.05)" }}
          >
            Gagal Memuat Analisa
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Terjadi masalah saat mengambil data analisa saham.
            <br />
            Kemungkinan ticker tidak valid atau server sedang sibuk.
          </p>
        </div>

        {/* Error detail */}
        {error.message && (
          <div
            className="rounded-2xl p-4 text-left"
            style={{
              background: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)",
              boxShadow:
                "inset 4px 4px 8px rgba(0,0,0,0.04), inset -4px -4px 8px rgba(255,255,255,0.5)",
            }}
          >
            <p className="text-xs font-mono text-amber-700 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Tips */}
        <div
          className="rounded-2xl p-4 text-left"
          style={{
            background: "linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)",
            boxShadow:
              "inset 4px 4px 8px rgba(0,0,0,0.03), inset -4px -4px 8px rgba(255,255,255,0.5)",
          }}
        >
          <p className="text-xs text-blue-700">
            💡 <strong>Tips:</strong> Pastikan ticker valid (contoh:{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">
              BBCA
            </code>
            ,{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">
              TLKM
            </code>
            ) dan coba lagi dalam beberapa saat.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(145deg, #a78bfa 0%, #8b5cf6 100%)",
              boxShadow:
                "6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.4)",
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(145deg, #e8e0f0 0%, #d4c5e2 100%)",
              boxShadow:
                "6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.5)",
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(145deg, #fde68a 0%, #fbbf24 100%)",
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
