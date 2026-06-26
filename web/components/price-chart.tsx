"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { StockPrice } from "@/lib/yahoo";
import type { TechnicalAnalysisResult } from "@/lib/technical";

interface SupportResistanceLevel {
  price: number;
  type: "support" | "resistance";
  strength: number;
  touches: number;
  label: string;
}

interface SupportResistanceData {
  supportLevels: SupportResistanceLevel[];
  resistanceLevels: SupportResistanceLevel[];
  currentPrice: number;
}

interface PriceChartProps {
  prices: StockPrice[];
  technical?: TechnicalAnalysisResult;
  supportResistance?: SupportResistanceData;
  height?: number;
}

/** Format number with thousand separators */
function formatPrice(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Legend overlay showing indicator colors */
function ChartLegend({
  technical,
  supportResistance,
}: {
  technical?: TechnicalAnalysisResult;
  supportResistance?: SupportResistanceData;
}) {
  const hasSMA20 = technical?.chartData?.sma20?.some((v) => v !== null);
  const hasSMA50 = technical?.chartData?.sma50?.some((v) => v !== null);
  const hasSMA200 = technical?.chartData?.sma200?.some((v) => v !== null);
  const hasSupport = supportResistance?.supportLevels && supportResistance.supportLevels.length > 0;
  const hasResistance = supportResistance?.resistanceLevels && supportResistance.resistanceLevels.length > 0;

  if (!hasSMA20 && !hasSMA50 && !hasSMA200 && !hasSupport && !hasResistance) return null;

  return (
    <div
      className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2.5 py-1.5 text-[10px] font-medium pointer-events-none"
      style={{ background: "rgba(26,26,46,0.85)", backdropFilter: "blur(4px)" }}
    >
      {hasSMA20 && (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 rounded-full"
            style={{ background: "#f59e0b" }}
          />
          <span style={{ color: "#f59e0b" }}>SMA 20</span>
        </span>
      )}
      {hasSMA50 && (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 rounded-full"
            style={{ background: "#3b82f6" }}
          />
          <span style={{ color: "#3b82f6" }}>SMA 50</span>
        </span>
      )}
      {hasSMA200 && (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 rounded-sm"
            style={{
              background: "repeating-linear-gradient(90deg, #dc2626 0, #dc2626 3px, transparent 3px, transparent 5px)",
              height: "2px",
            }}
          />
          <span style={{ color: "#dc2626" }}>SMA 200</span>
        </span>
      )}
      {hasSupport && (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 rounded-sm"
            style={{
              background: "repeating-linear-gradient(90deg, #22c55e 0, #22c55e 3px, transparent 3px, transparent 5px)",
              height: "2px",
            }}
          />
          <span style={{ color: "#22c55e" }}>Support</span>
        </span>
      )}
      {hasResistance && (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 rounded-sm"
            style={{
              background: "repeating-linear-gradient(90deg, #ef4444 0, #ef4444 3px, transparent 3px, transparent 5px)",
              height: "2px",
            }}
          />
          <span style={{ color: "#ef4444" }}>Resistance</span>
        </span>
      )}
    </div>
  );
}

export function PriceChart({
  prices,
  technical,
  supportResistance,
  height = 400,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#1a1a2e" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.04)" },
        horzLines: { color: "rgba(148, 163, 184, 0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(148, 163, 184, 0.3)", labelBackgroundColor: "#1a1a2e" },
        horzLine: { color: "rgba(148, 163, 184, 0.3)", labelBackgroundColor: "#1a1a2e" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    chartRef.current = chart;

    // ─── Candlestick Series ───
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeriesRef.current = candleSeries;

    // ─── Volume Series ───
    const volumeSeries = chart.addHistogramSeries({
      color: "#22c55e",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeriesRef.current = volumeSeries;

    // Format data
    const candleData = prices.map((p) => ({
      time: p.date as Time,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));

    const volumeData = prices.map((p) => ({
      time: p.date as Time,
      value: p.volume,
      color: p.close >= p.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // ─── Moving Averages (thin lines) ───
    if (technical?.chartData) {
      const cd = technical.chartData;
      const lineData = (values: (number | null)[]) =>
        values
          .map((v, i) =>
            v !== null ? { time: prices[i].date as Time, value: v } : null,
          )
          .filter((x): x is { time: Time; value: number } => x !== null);

      if (cd.sma20.some((v) => v !== null)) {
        const sma20Series = chart.addLineSeries({
          color: "#f59e0b",
          lineWidth: 1,
          title: "SMA 20",
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma20Series.setData(lineData(cd.sma20));
      }
      if (cd.sma50.some((v) => v !== null)) {
        const sma50Series = chart.addLineSeries({
          color: "#3b82f6",
          lineWidth: 1,
          title: "SMA 50",
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma50Series.setData(lineData(cd.sma50));
      }
      if (cd.sma200.some((v) => v !== null)) {
        const sma200Series = chart.addLineSeries({
          color: "#dc2626",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: "SMA 200",
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma200Series.setData(lineData(cd.sma200));
      }
    }

    // ─── Support / Resistance Lines ───
    if (supportResistance) {
      // Support levels — green dashed
      supportResistance.supportLevels.forEach((level, i) => {
        candleSeries.createPriceLine({
          price: level.price,
          color: "#22c55e",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `S${i + 1}: ${formatPrice(level.price)}`,
          axisLabelColor: "#22c55e",
        });
      });

      // Resistance levels — red dashed
      supportResistance.resistanceLevels.forEach((level, i) => {
        candleSeries.createPriceLine({
          price: level.price,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `R${i + 1}: ${formatPrice(level.price)}`,
          axisLabelColor: "#ef4444",
        });
      });
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [prices, technical, supportResistance, height]);

  return (
    <div className="relative w-full" style={{ height }}>
      <ChartLegend
        technical={technical}
        supportResistance={supportResistance}
      />
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
