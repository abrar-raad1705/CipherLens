"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { ScatterPoint } from "@/types/analysis";
import { useTheme } from "@/hooks/use-theme";

interface CorrelationScatterChartProps {
  points?: ScatterPoint[];
  direction?: "Horizontal" | "Vertical" | "Diagonal";
  imageLabel?: "Plaintext" | "Ciphertext";
  coefficient?: number;
  className?: string;
}

export function CorrelationScatterChart({
  points = [],
  direction = "Horizontal",
  imageLabel = "Plaintext",
  coefficient,
  className = "",
}: CorrelationScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = points.map((p) => [p.x, p.y]);
  const isPlain = imageLabel === "Plaintext";
  const color = isPlain
    ? isDark ? "#529CCA" : "#2383E2"
    : isDark ? "#FFAB5E" : "#D9730D";

  const isZeroCorrelation = coefficient !== undefined && Math.abs(coefficient) < 0.05;

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params: { data: number[] }) => `Pixel (x, y): (${params.data[0]}, ${params.data[1]})`,
      backgroundColor: isDark ? "#252525" : "#FFFFFF",
      borderColor: isDark ? "#383838" : "#EDEDEB",
      textStyle: { color: isDark ? "#E6E5E3" : "#37352F", fontSize: 11, fontFamily: "sans-serif" },
    },
    grid: { left: 40, right: 20, top: 30, bottom: 35 },
    xAxis: {
      type: "value",
      min: 0,
      max: 255,
      axisLabel: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10, fontFamily: "monospace" },
      splitLine: { lineStyle: { color: isDark ? "#262626" : "#F1F1EF", type: "dashed" } },
      axisLine: { lineStyle: { color: isDark ? "#2E2E2E" : "#EDEDEB" } },
      name: "Pixel (x, y)",
      nameLocation: "middle",
      nameGap: 20,
      nameTextStyle: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 255,
      axisLabel: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10, fontFamily: "monospace" },
      splitLine: { lineStyle: { color: isDark ? "#262626" : "#F1F1EF", type: "dashed" } },
      axisLine: { lineStyle: { color: isDark ? "#2E2E2E" : "#EDEDEB" } },
      name: "Adjacent Pixel",
      nameLocation: "middle",
      nameGap: 24,
      nameTextStyle: { color: isDark ? "#787774" : "#9B9A97", fontSize: 10 },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 3,
        itemStyle: { color, opacity: 0.6 },
        data,
      },
    ],
  };

  return (
    <div className={`rounded-lg bg-white dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] p-3 shadow-xs ${className}`}>
      {/* Header with Pearson r coefficient */}
      <div className="flex items-center justify-between px-1 pt-0.5 pb-2 border-b border-[#EDEDEB] dark:border-[#2E2E2E] mb-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
            {imageLabel} ({direction})
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-[#787774] dark:text-[#9B9B9B]">r =</span>
          <span
            className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
              isPlain
                ? "bg-[#D3E5EF] text-[#183347] dark:bg-[#1E394B] dark:text-[#529CCA]"
                : isZeroCorrelation
                ? "bg-[#DBEDDB] text-[#1C3829] dark:bg-[#203D2E] dark:text-[#4DAB9A]"
                : "bg-[#FADEC9] text-[#854C1D] dark:bg-[#593A19] dark:text-[#FFAB5E]"
            }`}
          >
            {coefficient !== undefined ? coefficient.toFixed(4) : "—"}
          </span>
        </div>
      </div>

      <ReactECharts option={option} style={{ height: "230px", width: "100%" }} />

      <div className="mt-1 px-1 text-[10px] text-[#787774] dark:text-[#9B9B9B] text-center">
        {isPlain
          ? "Diagonal alignment shows high correlation between neighbor pixels."
          : "Uniform random cloud proves all spatial correlation is destroyed (r ~ 0)."}
      </div>
    </div>
  );
}
