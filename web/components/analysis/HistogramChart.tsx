"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { useTheme } from "@/hooks/use-theme";

interface HistogramChartProps {
  plainBins?: number[];
  cipherBins?: number[];
  title?: string;
  className?: string;
}

export function HistogramChart({
  plainBins,
  cipherBins,
  title = "Intensity Distribution",
  className = "",
}: HistogramChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const xData = Array.from({ length: 256 }, (_, i) => i);

  const series = [];
  if (plainBins && plainBins.length === 256) {
    series.push({
      name: "Plaintext",
      type: "line",
      showSymbol: false,
      smooth: true,
      lineStyle: { width: 1.5, color: isDark ? "#5B8CFF" : "#2563EB" },
      data: plainBins,
    });
  }

  if (cipherBins && cipherBins.length === 256) {
    series.push({
      name: "Ciphertext",
      type: "line",
      showSymbol: false,
      smooth: true,
      lineStyle: { width: 1.5, color: isDark ? "#A0A09B" : "#6F6F6A" },
      data: cipherBins,
    });
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "#171717" : "#FFFFFF",
      borderColor: isDark ? "#292929" : "#E8E8E3",
      borderWidth: 1,
      textStyle: { color: isDark ? "#F2F2F0" : "#181818", fontSize: 12, fontFamily: "monospace" },
      axisPointer: { lineStyle: { color: isDark ? "#383838" : "#D7D7D1", width: 1, type: "dashed" } },
    },
    legend: {
      data: series.map((s) => s.name),
      textStyle: { color: isDark ? "#A0A09B" : "#6F6F6A", fontSize: 12, fontFamily: "monospace" },
      right: 8,
      top: 0,
    },
    grid: { left: 45, right: 10, top: 30, bottom: 28 },
    xAxis: {
      type: "category",
      data: xData,
      axisLabel: { color: isDark ? "#6A6A6A" : "#999993", fontSize: 10, fontFamily: "monospace" },
      axisLine: { lineStyle: { color: isDark ? "#292929" : "#E8E8E3" } },
      name: "Bin (0–255)",
      nameLocation: "middle",
      nameGap: 18,
      nameTextStyle: { color: isDark ? "#6A6A6A" : "#999993", fontSize: 10, fontFamily: "monospace" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: isDark ? "#6A6A6A" : "#999993", fontSize: 10, fontFamily: "monospace" },
      splitLine: { lineStyle: { color: isDark ? "#1F1F1F" : "#F4F4F1", type: "dashed" } },
    },
    series,
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
          {title}
        </span>
        <span className="text-xs font-mono text-[#999993] dark:text-[#6A6A6A]">
          256 Bins
        </span>
      </div>
      <div className="border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-3">
        <ReactECharts option={option} style={{ height: "230px", width: "100%" }} />
      </div>
    </div>
  );
}
