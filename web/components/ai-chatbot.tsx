"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  processMessage,
  type ChatMessage,
  type ChatSuggestion,
  type PortfolioSummaryData,
} from "@/lib/chatbot";
import { usePortfolio } from "@/lib/portfolio-storage";
import {
  calculateHoldings,
  calculateSummary,
} from "@/lib/portfolio";
import { useWatchlist } from "@/lib/watchlist-storage";

const STORAGE_KEY = "saham_chat_history";

export function AIChatbot() {
  const { transactions, mounted } = usePortfolio();
  const { tickers: watchlistTickers } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load chat history
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        setMessages(parsed.slice(-20)); // keep last 20
      } else {
        // Welcome message
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            text: "Halo! 👋 Saya asisten AI Saham Analyzer. Tanya saya soal portfolio, watchlist, atau minta rekomendasi saham.",
            timestamp: Date.now(),
            suggestions: [
              { label: "📊 Portfolio saya", prompt: "Portfolio saya" },
              { label: "⭐ Watchlist saya", prompt: "Watchlist saya" },
              { label: "📈 Saham bagus?", prompt: "Saham bagus hari ini?" },
              { label: "❓ Bantuan", prompt: "Bantuan" },
            ],
          },
        ]);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // ignore
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Compute portfolio summary for context
  const portfolioSummary: PortfolioSummaryData | undefined = useMemo(() => {
    if (!mounted || transactions.length === 0) return undefined;
    const holdings = calculateHoldings(transactions, {});
    const summary = calculateSummary(holdings, transactions);
    return {
      totalValue: summary.totalValue,
      totalCost: summary.totalCost,
      totalPL: summary.totalPL,
      totalPLPct: summary.totalPLPercent,
      holdingsCount: summary.holdingsCount,
      bestTrade: summary.bestTrade,
      worstTrade: summary.worstTrade,
    };
  }, [mounted, transactions]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    // Simulate slight delay for "thinking"
    await new Promise((r) => setTimeout(r, 350));

    try {
      const response = processMessage(trimmed, {
        portfolioSummary,
        watchlistTickers,
      });
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: "assistant",
        text: response.text,
        timestamp: Date.now(),
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: "Maaf, ada error. Coba lagi.",
          timestamp: Date.now(),
        },
      ]);
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSuggestion = (s: ChatSuggestion) => {
    if (s.href) {
      window.location.href = s.href;
      return;
    }
    if (s.prompt) {
      handleSend(s.prompt);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-30 md:bottom-4 md:right-20",
          "inline-flex items-center justify-center w-12 h-12 rounded-full",
          "bg-gradient-to-br from-primary to-purple-600 text-white",
          "shadow-lg hover:scale-105 transition-transform",
          open && "hidden",
        )}
        aria-label="Buka chatbot"
      >
        <Bot className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-white"></span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 md:inset-auto md:bottom-4 md:right-20 md:w-96 md:h-[600px] md:max-h-[80vh] flex items-end md:items-stretch bg-black/40 md:bg-transparent animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <Card className="w-full md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl shadow-2xl flex flex-col h-[90vh] md:h-full bg-background border-2 border-primary/20">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 p-4 border-b bg-gradient-to-r from-primary/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Asisten AI</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Saham Analyzer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onSuggestion={handleSuggestion}
                />
              ))}
              {busy && (
                <div className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-muted px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="border-t p-3 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya sesuatu..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={busy}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

function ChatBubble({
  message,
  onSuggestion,
}: {
  message: ChatMessage;
  onSuggestion: (s: ChatSuggestion) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2 items-start", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className={cn("flex flex-col gap-1.5 max-w-[80%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted rounded-tl-md",
          )}
        >
          {message.text}
        </div>
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
