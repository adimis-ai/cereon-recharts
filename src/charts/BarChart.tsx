// BarChart Component - Reusable bar chart with horizontal/vertical orientation, grouping, and stacking
"use client";

import React, { useMemo, useRef } from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
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
  BarChartConfig,
  ChartCardProps,
  BarChartCardSettings,
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

// ========================================
// Bar Chart Component
// ========================================

export interface BarChartProps extends BaseChartProps {
  config: BarChartConfig;
}

export function BarChart({
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
}: BarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Merge with defaults
  const config = useMemo(
    () => mergeChartConfig(userConfig, "bar", theme),
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
        let normalized = normalizeChartData(rawData);

        // Backend may return simple arrays like [{name, value}, ...].
        // Convert those to {index/name: <name>, value: <value>} shape
        if (
          Array.isArray(normalized) &&
          normalized.length > 0 &&
          typeof normalized[0] === "object" &&
          "name" in normalized[0] &&
          ("value" in normalized[0] || "downloads" in normalized[0])
        ) {
          normalized = normalized.map((r: any, i: number) => {
            const out: any = { ...r };
            // prefer explicit 'value' key, then 'downloads'
            if (r.value !== undefined) out.value = r.value;
            else if (r.downloads !== undefined) out.value = r.downloads;
            // ensure there's an index/key for categorical axis
            if (!("index" in out)) out.index = out.name ?? String(i);
            return out;
          });
        }

        const coerced = coerceNumericStrings(normalized as any[]);
        setChartData(coerced as any[]);
      } catch (e) {
        setChartData(normalizeChartData(rawData));
      }
    }
  }, [rawData]);

  // Generate series configuration if not provided
  const series = useMemo(() => {
    // If user provided series, prefer them — but only if their dataKeys exist
    // in the incoming data. If none of the provided series match the data,
    // fall back to auto-generating series from numeric fields so charts
    // still render for simple payload shapes (e.g. [{name, value}]).
    if (config.series?.length > 0) {
      const provided = config.series;
      try {
        const hasMatch =
          chartData && chartData.length
            ? provided.some((s) =>
                chartData.some((d: any) => typeof d?.[s.dataKey] === "number")
              )
            : false;
        if (hasMatch) return provided;
        // fallback to generation below
        console.warn(
          "BarChart: provided series dataKeys not found in data — auto-generating series instead",
          provided.map((p) => p.dataKey)
        );
      } catch (e) {
        // if anything goes wrong, continue to auto-generate
      }
    }

    // Auto-generate series from data keys
    const dataKeys =
      chartData.length > 0 && chartData[0]
        ? Object.keys(chartData[0]).filter(
            (key) =>
              key !== "index" &&
              key !== config.xAxis?.label?.value &&
              typeof chartData[0]?.[key] === "number"
          )
        : [];

    const colors = generateColorPalette(
      config.theme?.colors,
      dataKeys.length,
      theme
    );
    return generateSeriesConfig(chartData, dataKeys, colors, theme);
  }, [
    config.series,
    chartData,
    config.theme?.colors,
    config.xAxis?.label?.value,
    theme,
  ]);

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

  // Ensure there's room for category labels when layout is vertical
  const marginForChart = useMemo(() => {
    const m = { ...(margin || {}) } as Record<string, number>;
    if (config.orientation === "horizontal") {
      // reserve more left space for Y axis category labels (dates/names)
      const left = typeof m.left === "number" ? m.left : 0;
      if (left < 80) m.left = 80;
    }
    return m;
  }, [margin, config.orientation]);

  // Determine layout based on orientation
  // Recharts `layout` accepts 'horizontal' or 'vertical'.
  // For a horizontal-oriented bar chart (bars run left-to-right),
  // Recharts expects `layout="vertical"` (x axis = number, y axis = category).
  const layout = config.orientation === "horizontal" ? "vertical" : undefined;

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
        <RechartsBarChart
          data={chartData}
          layout={layout as any}
          margin={marginForChart}
          barSize={config.barSize}
          maxBarSize={config.maxBarSize}
          barGap={config.barGap}
          barCategoryGap={config.barCategoryGap}
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
              type={config.orientation === "horizontal" ? "number" : "category"}
              dataKey={(() => {
                if (config.orientation === "horizontal") return undefined;
                // prefer explicit xAxis label, then 'index', then first key
                const explicit = config.xAxis?.label?.value;
                if (explicit && chartData.some((d: any) => d && d[explicit] !== undefined))
                  return explicit;
                if (chartData.length && chartData[0] && chartData[0].date !== undefined)
                  return "date";
                const candidate = Object.keys(chartData[0] || {})[0];
                const missingCount = chartData.filter((d: any) => {
                  if (!candidate || typeof candidate !== "string") return true;
                  return d && typeof d[candidate] === "undefined";
                }).length;
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
              type={config.orientation === "horizontal" ? "category" : "number"}
              dataKey={
                (() => {
                  if (config.orientation !== "horizontal") return undefined;
                  const candidate =
                    config.yAxis?.label?.value ||
                    config.xAxis?.label?.value ||
                    Object.keys(chartData[0] || {})[0];
                  const missingCount = chartData.filter((d: any) => {
                    if (!candidate || typeof candidate !== "string") return true;
                    return d && typeof d[candidate] === "undefined";
                  }).length;
                  if (missingCount > chartData.length / 2) return "index";
                  return candidate;
                })()
              }
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
              cursor={{ fill: "var(--muted)", opacity: 0.2 }}
              content={
                <ChartTooltipContent
                  hideLabel={config.tooltip?.content?.hideLabel}
                  hideIndicator={config.tooltip?.content?.hideIndicator}
                  indicator="dashed"
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

          {/* Bars */}
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={`var(--color-${s.dataKey})`}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth || 0}
              opacity={s.opacity || 1}
              stackId={
                config.grouping === "stacked" ||
                config.grouping === "stacked100"
                  ? s.stackId || "default"
                  : undefined
              }
              radius={s.radius || 0}
              minPointSize={s.minPointSize || 0}
              maxBarSize={s.maxBarSize || config.maxBarSize}
            />
          ))}

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
              dataKey={(() => {
                const candidate =
                  config.orientation === "horizontal"
                    ? config.yAxis?.label?.value ||
                      Object.keys(chartData[0] || {})[0]
                    : config.xAxis?.label?.value ||
                      Object.keys(chartData[0] || {})[0];
                const missingCount = chartData.filter((d: any) => {
                  if (!candidate || typeof candidate !== "string") return true;
                  return d && typeof d[candidate] === "undefined";
                }).length;
                if (missingCount > chartData.length / 2) return "index";
                return candidate;
              })()}
              height={30}
              stroke="var(--muted-foreground)"
              fill="var(--muted)"
            />
          )}
        </RechartsBarChart>
      </ChartContainer>
    </div>
  );
}

// ========================================
// Bar Chart Card Component
// ========================================

export function BarChartCard({
  card,
  records,
  state,
  className,
  theme,
}: ChartCardProps<BarChartCardSettings>) {
  // Extract data from records
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
      <BarChart
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

// Add logging for BarChartCard data
(function attachBarCardLogging() {
  // no-op to keep tooling happy; actual logging is inside component via hook
})();

// Export both components
export default BarChart;
