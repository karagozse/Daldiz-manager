import { type ReactNode } from "react";

/**
 * Shared layout and styling for the four analysis charts on /analiz.
 * Ensures optical centering (left > right, bottom > top), consistent padding,
 * and same filter row alignment (year pill right-aligned).
 */

/** Tighter margins so chart uses more of the card; left keeps Y-axis visible. */
export const ANALYSIS_CHART_MARGIN = {
  top: 8,
  right: 8,
  bottom: 12,
  left: 20,
} as const;

export const ANALYSIS_CHART_HEIGHT = 220;
export const ANALYSIS_CHART_HEIGHT_CLASS = "h-[220px]";

/** Axis tick typography - shared across all four charts. */
export const ANALYSIS_TICK_STYLE = {
  fontSize: 10,
  fill: "hsl(var(--muted-foreground))",
} as const;

/** Tooltip content style - shared. */
export const ANALYSIS_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 12,
} as const;

/** Y-axis "ton/da" label: more legible, visually attached to axis (small offset). */
export const ANALYSIS_TON_DA_LABEL = {
  value: "ton/da",
  angle: -90,
  position: "insideLeft" as const,
  offset: 12,
  style: {
    fontSize: 11,
    fontWeight: 600,
    fill: "hsl(var(--foreground))",
    textAnchor: "middle" as const,
  },
};

/** Padding for card content area (below collapsible header). */
export const ANALYSIS_CARD_CONTENT_CLASS = "px-4 pb-4 pt-0 border-t border-border/50";

/** Filter row: left filters, right year pill; compact margin below. */
export const ANALYSIS_FILTER_ROW_CLASS = "flex flex-wrap items-center justify-between gap-2 mb-2";

/** Chart container: fixed height, overflow visible so axis labels don't clip. */
export const ANALYSIS_CHART_CONTAINER_CLASS = "h-[220px] overflow-visible";

/** XAxis padding so first/last ticks are visible. */
export const ANALYSIS_XAXIS_PADDING = { left: 6, right: 6 };
export const ANALYSIS_XAXIS_TICK_MARGIN = 2;

interface AnalysisChartFrameProps {
  children: ReactNode;
  className?: string;
}

/** Wraps the expandable content area of an analysis chart card (padding + border). */
export function AnalysisChartFrame({ children, className = "" }: AnalysisChartFrameProps) {
  return <div className={`${ANALYSIS_CARD_CONTENT_CLASS} ${className}`.trim()}>{children}</div>;
}

interface AnalysisChartFilterRowProps {
  children: ReactNode;
}

/** Filter row with consistent spacing above the chart; year pill should be last with ml-auto. */
export function AnalysisChartFilterRow({ children }: AnalysisChartFilterRowProps) {
  return <div className={ANALYSIS_FILTER_ROW_CLASS}>{children}</div>;
}

interface AnalysisChartContainerProps {
  children: ReactNode;
  className?: string;
}

/** Wrapper for ResponsiveContainer; prevents axis clipping. */
export function AnalysisChartContainer({ children, className = "" }: AnalysisChartContainerProps) {
  return (
    <div className={`${ANALYSIS_CHART_CONTAINER_CLASS} ${className}`.trim()}>
      {children}
    </div>
  );
}
