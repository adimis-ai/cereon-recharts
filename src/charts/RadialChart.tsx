// src/charts/RadialChart.tsx
"use client";

import React, { useMemo, useRef } from "react";
import {
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../ui";
import type {
  RadialChartConfig,
  ChartCardProps,
  RadialChartCardSettings,
  BaseChartProps,
  ChartDataPoint,
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

export interface RadialChartProps extends BaseChartProps {
  config: RadialChartConfig;
}

export function RadialChart({
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
}: RadialChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Merge with defaults
  const config = useMemo(
    () => mergeChartConfig(userConfig, "radial", theme),
    [userConfig, theme]
  );

  // Validate configuration
  const { isValid, errors } = useMemo(
    () => validateChartConfig(config),
    [config]
  );

  // Process and normalize data (reactive to realtime changes)
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>(() => {
    const normalized = normalizeChartData(rawData);

    // Transform data for radial chart format
    return normalized.map((item, index) => {
      const transformedItem: any = { ...item };

      // Add angle calculations for each series
      config.series.forEach((s, seriesIndex) => {
        const value = Number(item[s.dataKey] || 0);
        transformedItem[s.dataKey] = value;

        // Calculate fill based on value for progress indicators
        if (config.variant === "area") {
          transformedItem[`${s.dataKey}_fill`] = `${Math.min(
            100,
            (value / 100) * 100
          )}%`;
        }
      });

      return transformedItem;
    });
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
    const normalized = normalizeChartData(rawData);

    const computed = normalized.map((item, index) => {
      const transformedItem: any = { ...item };

      config.series.forEach((s, seriesIndex) => {
        const value = Number(item[s.dataKey] || 0);
        transformedItem[s.dataKey] = value;

        if (config.variant === "area") {
          transformedItem[`${s.dataKey}_fill`] = `${Math.min(
            100,
            (value / 100) * 100
          )}%`;
        }
      });

      return transformedItem;
    });

    const serialized = safeSerialize(rawData);
    if (serialized !== _rawDataSerialized.current) {
      _rawDataSerialized.current = serialized;
      setChartData(computed);
    }
  }, [rawData, config.series, config.variant]);

  // Generate series configuration if not provided
  const series = useMemo(() => {
    if (config.series?.length > 0) {
      return config.series;
    }

    // Auto-generate series from data keys
    const dataKeys =
      chartData.length > 0 && chartData[0]
        ? Object.keys(chartData[0]).filter(
            (key) =>
              key !== "index" &&
              key !== "name" &&
              key !== "category" &&
              !key.endsWith("_fill") &&
              typeof chartData[0]?.[key] === "number"
          )
        : [];

    const colors = generateColorPalette(
      config.theme?.colors,
      dataKeys.length,
      theme
    );
    return generateSeriesConfig(chartData, dataKeys, colors, theme);
  }, [config.series, chartData, config.theme?.colors, theme]);

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

  // Calculate radial dimensions
  const radialDimensions = useMemo(() => {
    const outerRadius =
      typeof config.outerRadius === "string"
        ? parseInt(config.outerRadius.replace("%", ""))
        : config.outerRadius || 80;

    const innerRadius =
      typeof config.innerRadius === "string"
        ? parseInt(config.innerRadius.replace("%", ""))
        : config.innerRadius || 20;

    return { outerRadius, innerRadius };
  }, [config.outerRadius, config.innerRadius]);

  // Handle responsive dimensions
  const dimensions = useMemo(() => {
    if (typeof width === "number" && typeof height === "number") {
      return calculateResponsiveDimensions(
        { width, height },
        config.aspectRatio,
        300,
        300
      );
    }
    return { width: "100%", height };
  }, [width, height, config.aspectRatio]);

  // Calculate margins
  const margin = useMemo(() => {
    const containerWidth = typeof width === "number" ? width : 400;
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
          <div className="w-64 h-64 bg-muted rounded-full"></div>
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
        <RechartsRadialBarChart
          data={chartData}
          cx="50%"
          cy={"50%"}
          barSize={config?.barSize || 14}
          barGap={config?.barGap || 4}
          innerRadius={`${radialDimensions.innerRadius}%`}
          outerRadius={`${radialDimensions.outerRadius}%`}
          startAngle={config.startAngle || 0}
          endAngle={config.endAngle || 360}
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
          {/* Polar Angle Axis */}
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />

          {/* Tooltip */}
          {config.tooltip?.enabled !== false && (
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel={config.tooltip?.content?.hideLabel}
                  hideIndicator={config.tooltip?.content?.hideIndicator}
                  indicator="dot"
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

          {/* Radial Bars */}
          {series.map((s, index) => {
            return (
              <RadialBar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={`var(--color-${s.dataKey})`}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth || 0}
                cornerRadius={config.cornerRadius || 0}
                angleAxisId={0}
                background={{ fill: "var(--muted)" }}
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
        </RechartsRadialBarChart>
      </ChartContainer>
    </div>
  );
}

export function RadialChartCard({
  card,
  records,
  state,
  className,
  theme,
}: ChartCardProps<RadialChartCardSettings>) {
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
      <RadialChart
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
