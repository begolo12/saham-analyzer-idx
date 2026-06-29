"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            background: "#f8f5ff",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(145deg, #ffecd2 0%, #fcb69f 100%)",
                boxShadow:
                  "8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.6)",
              }}
            >
              <AlertTriangle
                style={{ width: "2.5rem", height: "2.5rem", color: "#f97316" }}
              />
            </div>

            {/* Title */}
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: "0.5rem",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                Aplikasi Mengalami Masalah
              </h1>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                Terjadi kesalahan pada aplikasi utama.
                <br />
                Silakan muat ulang halaman.
              </p>
            </div>

            {/* Error detail */}
            {error.message && (
              <div
                style={{
                  width: "100%",
                  borderRadius: "1rem",
                  padding: "1rem",
                  textAlign: "left",
                  background:
                    "linear-gradient(145deg, #fff5f5 0%, #ffe0e0 100%)",
                  boxShadow:
                    "inset 4px 4px 8px rgba(0,0,0,0.04), inset -4px -4px 8px rgba(255,255,255,0.5)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    color: "#dc2626",
                    wordBreak: "break-all",
                  }}
                >
                  {error.message}
                </p>
              </div>
            )}

            {/* Retry */}
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "1rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "white",
                border: "none",
                cursor: "pointer",
                background:
                  "linear-gradient(145deg, #a78bfa 0%, #8b5cf6 100%)",
                boxShadow:
                  "6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.4)",
                transition: "transform 0.15s ease",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.97)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <RefreshCw style={{ width: "1rem", height: "1rem" }} />
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
