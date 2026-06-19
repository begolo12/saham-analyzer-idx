"use client";

import { useState, useEffect } from "react";
import { X, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCashEntry } from "@/lib/cash-storage";
import { type CashEntryType } from "@/lib/cash-ledger";
import { formatIDR, cn } from "@/lib/utils";
import { toast } from "sonner";

interface CashModalProps {
  defaultType?: CashEntryType;
  currentCash?: number; // Untuk validasi withdraw > saldo
  onClose: () => void;
}

export function CashModal({
  defaultType = "TOPUP",
  currentCash = 0,
  onClose,
}: CashModalProps) {
  const [type, setType] = useState<CashEntryType>(defaultType);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync type if parent toggles
  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, ""));
  const isWithdraw = type === "WITHDRAW";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }

    if (isWithdraw && amountNum > currentCash) {
      toast.error(
        `Saldo tidak cukup. Kas saat ini: ${formatIDR(currentCash)}`,
      );
      return;
    }

    setSubmitting(true);
    try {
      addCashEntry({
        type,
        amount: amountNum,
        date,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `${isWithdraw ? "💸 Withdraw" : "💰 Top Up"} ${formatIDR(amountNum)}`,
        {
          description: isWithdraw
            ? "Saldo kas berkurang."
            : "Saldo kas bertambah.",
          duration: 4000,
        },
      );

      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = isWithdraw
    ? [100_000, 500_000, 1_000_000, 5_000_000]
    : [500_000, 1_000_000, 5_000_000, 10_000_000];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <Card
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">
                {isWithdraw ? "Withdraw" : "Top Up"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isWithdraw
                  ? "Tarik dana dari akun virtual"
                  : "Tambah modal ke akun virtual"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Top Up / Withdraw Toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setType("TOPUP")}
              className={cn(
                "rounded-xl border-2 p-3 font-semibold transition-all",
                !isWithdraw
                  ? "border-bull-500 bg-bull-50 dark:bg-bull-700/20 text-bull-700 dark:text-bull-500"
                  : "border-border hover:border-bull-500/50",
              )}
            >
              <ArrowDownToLine className="h-5 w-5 mx-auto mb-1" />
              TOP UP
            </button>
            <button
              type="button"
              onClick={() => setType("WITHDRAW")}
              className={cn(
                "rounded-xl border-2 p-3 font-semibold transition-all",
                isWithdraw
                  ? "border-bear-500 bg-bear-50 dark:bg-bear-700/20 text-bear-700 dark:text-bear-500"
                  : "border-border hover:border-bear-500/50",
              )}
            >
              <ArrowUpFromLine className="h-5 w-5 mx-auto mb-1" />
              WITHDRAW
            </button>
          </div>

          {/* Current cash display (only for withdraw) */}
          {isWithdraw && currentCash > 0 && (
            <div className="mb-3 rounded-lg bg-muted/50 p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Saldo kas saat ini</span>
              <span className="font-bold tabular-nums">
                {formatIDR(currentCash)}
              </span>
            </div>
          )}

          {/* Amount */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Nominal (Rp)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isWithdraw ? "500000" : "1000000"}
              className="mt-1 h-14 text-2xl font-bold tabular-nums"
              autoFocus
              required
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {quickAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-accent transition-colors"
                >
                  {preset >= 1_000_000
                    ? `${preset / 1_000_000}jt`
                    : `${preset / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">
              Tanggal
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-12"
              required
            />
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan (opsional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isWithdraw ? "Tarik profit ke rekening..." : "Deposit awal..."
              }
              className="mt-1 h-10"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className={cn(
              "w-full",
              isWithdraw
                ? "bg-bear-600 hover:bg-bear-700"
                : "bg-bull-600 hover:bg-bull-700",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                {isWithdraw ? "💸" : "💰"} Konfirmasi{" "}
                {isWithdraw ? "Withdraw" : "Top Up"}{" "}
                {amountNum ? formatIDR(amountNum) : ""}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
