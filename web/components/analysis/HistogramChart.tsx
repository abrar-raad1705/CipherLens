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
  title = "256-Bin Intensity Histogram Distribution",
  className = "",
}: HistogramChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const xData = Array.from({ length: 256 }, (_, i) => i);

  const series = [];
  if (plainBins && plainBins.length === 256) {
    series.push({
      name: "Plaintext Target",
      type: "line",
      showSymbol: false,
      smooth: true,
      lineStyle: { width: 1.5, color: isDark ? "#529CCA" : "#2383E2" },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: isDark ? "rgba(82, 156, 202, 0.25)" : "rgba(35, 131, 226, 0.2)" },
            { offset: 1, color: "rgba(35, 131, 226, 0.01)" },
          ],
        },
      },
      data: plainBins,
    });
  }

  if (cipherBins && cipherBins.length === 256) {
    series.push({
      name: "Ciphertext (DRPE)",
      type: "line",
      showSymbol: false,
      smooth: true,
      lineStyle: { width: 1.5, color: isDark ? "#FFAB5E" : "#D9730D" },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: isDark ? "rgba(255, 171, 94, 0.25)" : "rgba(217, 115, 13, 0.2)" },
            { offset: 1, color: "rgba(217, 115, 13, 0.01)" },
          ],
        },
      },
      data: cipherBins,
    });
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "#252525" : "#FFFFFF",
      borderColor: isDark ? "#383838" : "#EDEDEB",
      borderWidth: 1,
      textStyle: { color: isDark ? "#E6E5E3" : "#37352F", fontSize: 11, fontFamily: "sans-serif" },
      axisPointer: { lineStyle: { color: isDark ? "#6A6A6A" : "#9B9A97", width: 1, type: "dashed" } },
    },
    legend: {
      data: series.map((s) => s.name),
      textStyle: { color: isDark ? "#9B9B9B" : "#787774", fontSize: 11, fontFamily: "sans-serif" },
      right: 12,
      top: 8,
    },
    grid: { left: 45, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: "category",
      data: xData,
      axisLabel: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10, fontFamily: "monospace" },
      axisLine: { lineStyle: { color: isDark ? "#2E2E2E" : "#EDEDEB" } },
      name: "Intensity (0-255)",
      nameLocation: "middle",
      nameGap: 18,
      nameTextStyle: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10, fontFamily: "monospace" },
      splitLine: { lineStyle: { color: isDark ? "#262626" : "#F1F1EF", type: "dashed" } },
    },
    series,
  };

  return (
    <div className={`rounded-lg bg-white dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] p-3.5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between px-1 pt-0.5 pb-2 border-b border-[#EDEDEB] dark:border-[#2E2E2E] mb-2">
        <span className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
          {title}
        </span>
        <span className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
          Ideal Cipher = Uniform Distribution
        </span>
      </div>
      <ReactECharts option={option} style={{ height: "260px", width: "100%" }} />
    </div>
  );
}
