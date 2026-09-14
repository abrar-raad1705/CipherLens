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
  const pointColor = isPlain
    ? isDark ? "#5B8CFF" : "#2563EB"
    : isDark ? "#A0A09B" : "#6F6F6A";

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params: { data: number[] }) => `Pixel: (${params.data[0]}, ${params.data[1]})`,
      backgroundColor: isDark ? "#171717" : "#FFFFFF",
      borderColor: isDark ? "#292929" : "#E8E8E3",
      textStyle: { color: isDark ? "#F2F2F0" : "#181818", fontSize: 11, fontFamily: "monospace" },
    },
    grid: { left: 35, right: 10, top: 20, bottom: 25 },
    xAxis: {
      type: "value",
      min: 0,
      max: 255,
      axisLabel: { color: isDark ? "#6A6A6A" : "#999993", fontSize: 9, fontFamily: "monospace" },
      splitLine: { lineStyle: { color: isDark ? "#1F1F1F" : "#F4F4F1", type: "dashed" } },
      axisLine: { lineStyle: { color: isDark ? "#292929" : "#E8E8E3" } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 255,
      axisLabel: { color: isDark ? "#6A6A6A" : "#999993", fontSize: 9, fontFamily: "monospace" },
      splitLine: { lineStyle: { color: isDark ? "#1F1F1F" : "#F4F4F1", type: "dashed" } },
      axisLine: { lineStyle: { color: isDark ? "#292929" : "#E8E8E3" } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 2.5,
        itemStyle: { color: pointColor, opacity: 0.5 },
        data,
      },
    ],
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
          {imageLabel} ({direction})
        </span>
        <span className="font-mono text-[11px] text-[#181818] dark:text-[#F2F2F0]">
          r = {coefficient !== undefined ? coefficient.toFixed(4) : "—"}
        </span>
      </div>

      <div className="border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-2">
        <ReactECharts option={option} style={{ height: "180px", width: "100%" }} />
      </div>
    </div>
  );
}
