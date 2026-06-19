"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  CrosshairMode,
} from "lightweight-charts";
import type { StockPrice } from "@/lib/yahoo";
import type { TechnicalAnalysisResult } from "@/lib/technical";

interface PriceChartProps {
  prices: StockPrice[];
  technical?: TechnicalAnalysisResult;
  height?: number;
}

export function PriceChart({ prices, technical, height = 400 }: PriceChartProps) {
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
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.1)" },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeriesRef.current = candleSeries;

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
      color: p.close >= p.open ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Add moving averages
    if (technical?.chartData) {
      const cd = technical.chartData;
      const lineData = (values: (number | null)[]) =>
        values
          .map((v, i) => (v !== null ? { time: prices[i].date as Time, value: v } : null))
          .filter((x): x is { time: Time; value: number } => x !== null);

      if (cd.sma20.some((v) => v !== null)) {
        const sma20Series = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1, title: "SMA 20" });
        sma20Series.setData(lineData(cd.sma20));
      }
      if (cd.sma50.some((v) => v !== null)) {
        const sma50Series = chart.addLineSeries({ color: "#3b82f6", lineWidth: 1, title: "SMA 50" });
        sma50Series.setData(lineData(cd.sma50));
      }
      if (cd.sma200.some((v) => v !== null)) {
        const sma200Series = chart.addLineSeries({ color: "#dc2626", lineWidth: 1, title: "SMA 200" });
        sma200Series.setData(lineData(cd.sma200));
      }
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [prices, technical, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
