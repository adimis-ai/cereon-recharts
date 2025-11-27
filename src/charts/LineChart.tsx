// src/charts/LineChart.tsx
"use client";

import React, { useMemo, useRef } from "react";
import {
  Line,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../ui";
import type {
  LineChartConfig,
  ChartCardProps,
  LineChartCardSettings,
  BaseChartProps,
} from "./types";
import {
  normalizeChartData,
  generateColorPalette,
  generateSeriesConfig,
  mergeChartConfig,
  validateChartConfig,
  calculateResponsiveDimensions,
  getResponsiveMargin,
} from "./utils";

export interface LineChartProps extends BaseChartProps {
  config: LineChartConfig;
}

export function LineChart({
  data: rawData,
  config: userConfig,
  width = "100%",
  height = 400,
  className = "",
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
  onLegendClick,
  theme,
}: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Merge with defaults
  const config = useMemo(
    () => mergeChartConfig(userConfig, "line", theme),
    [userConfig, theme]
  );

  // Validate configuration
  const { isValid, errors } = useMemo(
    () => validateChartConfig(config),
    [config]
  );

  // Process and normalize data (reactive to realtime changes)
  const [chartData, setChartData] = React.useState(() =>
    normalizeChartData(rawData)
  );

  const coerceNumericStrings = (arr: any[]) =>
    arr.map((item) => {
      if (!item || typeof item !== "object") return item;
      const out: Record<string, any> = { ...item };
      Object.keys(out).forEach((k) => {
        const v = out[k];
        if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) {
          out[k] = Number(v);
        }
      });
      return out;
    });

  const _rawDataSerialized = React.useRef<string | null>(null);
  const safeSerialize = (v: any) => {
    try {
      return JSON.stringify(v);
    } catch (e) {
      return String(v);
    }
  };

  React.useEffect(() => {
    const serialized = safeSerialize(rawData);
    if (serialized !== _rawDataSerialized.current) {
      _rawDataSerialized.current = serialized;
      try {
        const normalized = normalizeChartData(rawData);
        const coerced = coerceNumericStrings(normalized as any[]);
        setChartData(coerced as any[]);
      } catch (e) {
        setChartData(normalizeChartData(rawData));
      }
    }
  }, [rawData]);

  // Generate series configuration if not provided
  const series = useMemo(() => {
    if (config.series?.length > 0) {
      return config.series;
    }

    // Auto-generate series from data keys
    const xAxisKey =
      (config.xAxis as any)?.dataKey || config.xAxis?.label?.value;
    const dataKeys =
      chartData.length > 0 && chartData[0]
        ? Object.keys(chartData[0]).filter(
            (key) =>
              key !== "index" &&
              key !== xAxisKey &&
              typeof chartData[0]?.[key] === "number"
          )
        : [];

    const colors = generateColorPalette(
      config.theme?.colors,
      dataKeys.length,
      theme
    );
    return generateSeriesConfig(chartData, dataKeys, colors, theme);
  }, [config.series, chartData, config.theme?.colors, config.xAxis, theme]);

  // Create chart configuration for ChartContainer
  const chartConfig = useMemo(() => {
    const configObj: Record<string, any> = {};

    series.forEach((s, index) => {
      configObj[s.dataKey] = {
        label: s.name || s.dataKey,
        color: s.color,
      };
    });

    return configObj;
  }, [series]);

  // Handle responsive dimensions
  const dimensions = useMemo(() => {
    if (typeof width === "number" && typeof height === "number") {
      return calculateResponsiveDimensions(
        { width, height },
        config.aspectRatio,
        300,
        200
      );
    }
    return { width: "100%", height };
  }, [width, height, config.aspectRatio]);

  // Calculate margins
  const margin = useMemo(() => {
    const containerWidth = typeof width === "number" ? width : 800;
    return getResponsiveMargin(containerWidth, config.margin);
  }, [width, config.margin]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-destructive mb-2">Chart Error</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-destructive mb-2">Configuration Error</div>
          <div className="text-sm text-muted-foreground">
            {errors.join(", ")}
          </div>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-muted-foreground">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div ref={chartRef} className={className} style={{ width, height }}>
      <ChartContainer
        config={chartConfig}
        className="h-full w-full aspect-auto"
      >
        <RechartsLineChart
          data={chartData}
          margin={margin}
          onMouseMove={(state: any) => {
            if (state?.activePayload?.length && onDataPointHover) {
              onDataPointHover(
                state.activePayload[0].payload,
                state.activeTooltipIndex
              );
            }
          }}
          onClick={(state: any) => {
            if (state?.activePayload?.length && onDataPointClick) {
              onDataPointClick(
                state.activePayload[0].payload,
                state.activeTooltipIndex
              );
            }
          }}
        >
          {/* Grid */}
          {config.xAxis?.grid?.enabled !== false &&
            config.yAxis?.grid?.enabled !== false && (
              <CartesianGrid
                stroke={config.theme?.grid?.color || "var(--border)"}
                strokeDasharray={config.theme?.grid?.strokeDasharray || "3 3"}
                opacity={config.theme?.grid?.opacity || 0.5}
                vertical={config.xAxis?.grid?.enabled ?? true}
                horizontal={config.yAxis?.grid?.enabled ?? true}
              />
            )}

          {/* X Axis */}
          {config.xAxis?.enabled !== false && (
            <XAxis
              dataKey={(() => {
                const candidate =
                  (config.xAxis as any)?.dataKey ||
                  config.xAxis?.label?.value ||
                  Object.keys(chartData[0] || {})[0];

                const missingCount = chartData.filter(
                  (d: any) => d && typeof d[candidate] === "undefined"
                ).length;
                if (missingCount > chartData.length / 2) return "index";
                return candidate;
              })()}
              axisLine={config.xAxis?.line?.enabled !== false}
              tickLine={config.xAxis?.tick !== undefined}
              tick={{
                fontSize: config.xAxis?.tick?.fontSize || 12,
                fill: config.xAxis?.tick?.color || "var(--muted-foreground)",
                ...config.xAxis?.tick,
              }}
              tickFormatter={
                typeof config.xAxis?.tick?.formatter === "function"
                  ? config.xAxis.tick.formatter
                  : undefined
              }
              domain={
                Array.isArray(config.xAxis?.domain)
                  ? (config.xAxis.domain as [any, any])
                  : undefined
              }
              scale={config.xAxis?.scale || "auto"}
            />
          )}

          {/* Y Axis */}
          {config.yAxis?.enabled !== false && (
            <YAxis
              axisLine={config.yAxis?.line?.enabled !== false}
              tickLine={config.yAxis?.tick !== undefined}
              tick={{
                fontSize: config.yAxis?.tick?.fontSize || 12,
                fill: config.yAxis?.tick?.color || "var(--muted-foreground)",
                ...config.yAxis?.tick,
              }}
              tickFormatter={
                typeof config.yAxis?.tick?.formatter === "function"
                  ? config.yAxis.tick.formatter
                  : undefined
              }
              domain={
                Array.isArray(config.yAxis?.domain)
                  ? (config.yAxis.domain as [any, any])
                  : undefined
              }
              scale={config.yAxis?.scale || "auto"}
            />
          )}

          {/* Tooltip */}
          {config.tooltip?.enabled !== false && (
            <ChartTooltip
              cursor={
                config.tooltip?.trigger === "hover"
                  ? { strokeDasharray: "3 3" }
                  : false
              }
              content={
                <ChartTooltipContent
                  hideLabel={config.tooltip?.content?.hideLabel}
                  hideIndicator={config.tooltip?.content?.hideIndicator}
                  indicator="line"
                  labelKey={config.tooltip?.content?.labelKey}
                  formatter={
                    typeof config.tooltip?.formatter?.value === "function"
                      ? (config.tooltip.formatter.value as any)
                      : undefined
                  }
                  labelFormatter={
                    typeof config.tooltip?.formatter?.label === "function"
                      ? (config.tooltip.formatter.label as any)
                      : undefined
                  }
                />
              }
            />
          )}

          {/* Lines */}
          {series.map((s) => {
            // Prefer explicit series stroke/fill from generated config, fallback to CSS var if absent
            const strokeColor =
              s.stroke || s.color || `var(--color-${s.dataKey})`;
            const dotFill =
              s.dot?.color || s.color || `var(--color-${s.dataKey})`;

            return (
              <Line
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                type="monotone"
                stroke={strokeColor}
                strokeWidth={s.strokeWidth || config.strokeWidth || 2}
                strokeDasharray={s.strokeDasharray}
                connectNulls={
                  s.connectNulls !== false && config.connectNulls !== false
                }
                dot={
                  config.dots !== false && s.dot?.enabled !== false
                    ? {
                        r: s.dot?.size || config.dotSize || 4,
                        fill: dotFill,
                        strokeWidth: s.dot?.strokeWidth || 0,
                      }
                    : false
                }
                activeDot={{
                  r: (s.dot?.size || config.dotSize || 4) + 2,
                  stroke: strokeColor,
                  strokeWidth: 2,
                  fill: "var(--background)",
                }}
              />
            );
          })}

          {/* Legend */}
          {config.legend?.enabled !== false && (
            <ChartLegend
              content={
                <ChartLegendContent
                  hideIcon={config.legend?.hideIcon}
                  className={
                    config.legend?.position === "top" ? "pb-3" : "pt-3"
                  }
                />
              }
            />
          )}

          {/* Data Zoom/Brush */}
          {config.responsive && (
            <Brush
              dataKey={
                (config.xAxis as any)?.dataKey ||
                config.xAxis?.label?.value ||
                Object.keys(chartData[0] || {})[0]
              }
              height={30}
              stroke="var(--muted-foreground)"
              fill="var(--muted)"
            />
          )}
        </RechartsLineChart>
      </ChartContainer>
    </div>
  );
}

export function LineChartCard({
  card,
  records,
  state,
  className,
  theme,
}: ChartCardProps<LineChartCardSettings>) {
  const data = useMemo(() => {
    if (!records?.length) return [];

    // Handle different record formats
    const firstRecord = records[0];
    if (firstRecord && Array.isArray((firstRecord as any).data)) {
      return (firstRecord as any).data;
    }

    // Handle single record
    return records as any[];
  }, [records]);

  return (
    <div className={`w-full h-full ${className || ""}`}>
      <LineChart
        data={data}
        config={card.settings.chartConfig}
        width="100%"
        height="100%"
        loading={state?.loadingState === "loading"}
        error={state?.error || null}
        theme={theme}
        className="w-full h-full"
      />
    </div>
  );
}
