/**
 * ScoreChart Component - Single Source of Truth for Score Trend Charts
 * 
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DO NOT CHANGE AXES / PADDING / LABELS WITHOUT PRODUCT APPROVAL            ║
 * ║  This component is locked. Any changes require explicit sign-off.          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * VISUAL SPEC:
 * - Height: 110-120px
 * - Y-axis: 0-100, ticks at 0/25/50/75/100 (subtle)
 * - X-axis: 3 date labels with left/right padding
 * - Dots: All 3 visible, latest = circled marker (emphasized), previous = small muted
 * - Labels: Score above each dot, latest bold, others muted
 * - Data: ONLY COMPLETED evaluation scores, latest 3 points
 * 
 * USAGE:
 * - Dashboard (campus cards)
 * - Gardens page (campus summary)
 * - Garden Detail page (garden score card)
 */

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

interface ScoreChartProps {
  data: { month: string; score: number | null }[];
  height?: number;
}

const ScoreChart = ({ data, height = 120 }: ScoreChartProps) => {
  // LOCKED: Only show latest 3 COMPLETED data points
  const chartData = data.slice(-3);
  const dataLength = chartData.length;
  // Son gerçek değeri olan nokta (null olan aylar atlanır) – Dashboard/Bahçeler'de son ay null olunca vurgu doğru noktada olsun
  const lastFilledIndex = (() => {
    let i = dataLength - 1;
    while (i >= 0 && (chartData[i]?.score == null || chartData[i]?.score === undefined)) i--;
    return i >= 0 ? i : dataLength - 1;
  })();

  // LOCKED: Custom label renderer - shows score above each dot; last filled = bold
  const renderCustomLabel = (props: any) => {
    const { x, y, value, index } = props;
    if (x === undefined || y === undefined || value === undefined || value === null) return null;

    const isLast = index === lastFilledIndex;
    const fillColor = isLast ? "hsl(var(--success))" : "hsl(var(--success) / 0.6)";
    const fontWeight = isLast ? 700 : 500;

    return (
      <text
        x={x}
        y={y - 14}
        fill={fillColor}
        textAnchor="middle"
        fontSize={11}
        fontWeight={fontWeight}
      >
        {value}
      </text>
    );
  };

  // LOCKED: Custom dot renderer - last filled point = solid circle (dolu), same as garden detail
  const CustomDot = (props: any) => {
    const { cx, cy, index, value } = props;
    if (cx === undefined || cy === undefined || value === null || value === undefined) return null;

    const isLast = index === lastFilledIndex;

    if (isLast) {
      // Son nokta: dolu yuvarlak, ince stroke (ring değil) – bahçe detay ile aynı
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="hsl(var(--success))"
          stroke="white"
          strokeWidth={1.5}
        />
      );
    }

    // Önceki noktalar: küçük silik
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="hsl(var(--success) / 0.5)"
        stroke="white"
        strokeWidth={1.5}
      />
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Henüz değerlendirme yok
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* LOCKED: margins ensure labels don't clip, line doesn't start on Y-axis */}
        <LineChart data={chartData} margin={{ top: 28, right: 16, left: -8, bottom: 4 }}>
          {/* LOCKED: Light horizontal gridlines at Y ticks */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            strokeOpacity={1}
            horizontal={true}
            vertical={false}
          />
          {/* LOCKED: X-axis with padding so labels not flush to edges - Türkçe ay isimleri */}
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#737373' }}
            dy={4}
            padding={{ left: 16, right: 16 }}
          />
          {/* LOCKED: Y-axis 0-100 - stepSize 25, visible labels */}
          <YAxis 
            domain={[0, 100]} 
            ticks={[0, 25, 50, 75, 100]}
            allowDataOverflow={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#737373', fontWeight: 500 }}
            width={32}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--success))"
            strokeWidth={2.5}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: 'hsl(var(--success))', stroke: 'white', strokeWidth: 2 }}
            label={renderCustomLabel}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreChart;
