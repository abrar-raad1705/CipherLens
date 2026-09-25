"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { useTheme } from "@/hooks/use-theme";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface HistogramChartProps {
  plainBins?: number[];
  cipherBins?: number[];
  recoveredBins?: number[];
  title?: string;
  className?: string;
  chartHeight?: string;
  useCardLayout?: boolean;
  showBinCount?: boolean;
}

export function HistogramChart({
  plainBins,
  cipherBins,
  recoveredBins,
  title = "Intensity Distribution",
  className = "",
  chartHeight = "360px",
  useCardLayout = false,
  showBinCount = false,
}: HistogramChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const numBins = plainBins?.length || cipherBins?.length || recoveredBins?.length || 256;
  const xData = Array.from({ length: numBins }, (_, i) => i);

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

  if (recoveredBins && recoveredBins.length === 256) {
    series.push({
      name: "Reconstructed",
      type: "line",
      showSymbol: false,
      smooth: true,
      lineStyle: { width: 1.5, color: isDark ? "#34D399" : "#059669" },
      data: recoveredBins,
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
      name: `Bin (0–${numBins - 1})`,
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

  if (useCardLayout) {
    return (
      <Card className={`overflow-hidden flex flex-col ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#1B1B1B]">
          <div className="text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0]">
            {title}
          </div>
          {showBinCount && numBins > 256 && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-md border border-[#E8E8E3] dark:border-[#2C2C2C] bg-white dark:bg-[#262626] text-[#6F6F6A] dark:text-[#A0A09B]">
              {numBins} Bins
            </span>
          )}
        </div>
        <CardContent className="p-3 sm:p-4 flex-1 flex flex-col justify-center">
          <ReactECharts option={option} style={{ height: chartHeight, width: "100%" }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0]">
          {title}
        </span>
        {showBinCount && numBins > 256 && (
          <span className="text-xs font-mono text-[#999993] dark:text-[#6A6A6A]">
            {numBins} Bins
          </span>
        )}
      </div>
      <div className="border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-3">
        <ReactECharts option={option} style={{ height: chartHeight, width: "100%" }} />
      </div>
    </div>
  );
}
