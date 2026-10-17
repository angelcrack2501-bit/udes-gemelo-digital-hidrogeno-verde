"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "./ui";

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: { t: number; v: number }[];
  dashed?: boolean;
}

export interface ChartThreshold {
  value: number;
  label: string;
  color: string;
}

export interface ChartMarker {
  t: number;
  color: string;
  label: string;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(min: number, max: number, n = 4): { ticks: number[]; digits: number } {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + (Math.abs(step / mag - 2.5) < 1e-9 ? 1 : 0));
  return { ticks, digits };
}

export default function LineChart({
  title, unit, series, thresholds = [], markers = [], cursorT, xMax, height = 190, onSeek, badge,
}: {
  title: string;
  unit: string;
  series: ChartSeries[];
  thresholds?: ChartThreshold[];
  markers?: ChartMarker[];
  cursorT?: number;
  xMax: number;
  height?: number;
  onSeek?: (t: number) => void;
  badge?: React.ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const pad = { l: 46, r: 12, t: 8, b: 22 };
  const plotW = Math.max(10, width - pad.l - pad.r);
  const plotH = height - pad.t - pad.b;
  const hasData = series.some((s) => s.points.length > 1);

  const [yMin, yMax] = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of series) for (const p of s.points) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); }
    for (const t of thresholds) { lo = Math.min(lo, t.value); hi = Math.max(hi, t.value); }
    if (!Number.isFinite(lo)) return [0, 1];
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const m = (hi - lo) * 0.08;
    return [lo >= 0 && lo - m < 0 ? 0 : lo - m, hi + m];
  }, [series, thresholds]);

  const x = (t: number) => pad.l + (t / xMax) * plotW;
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const { ticks: yTicks, digits: yDigits } = niceTicks(yMin, yMax);
  const xTicks = niceTicks(0, xMax / 60, 6).ticks.map((m) => m * 60);

  const handle = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onSeek || (e.type === "pointermove" && e.buttons !== 1)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left - pad.l) / plotW) * xMax;
    onSeek(Math.min(xMax, Math.max(0, t)));
  };

  const cursorVals = cursorT !== undefined
    ? series.filter((s) => !s.dashed).map((s) => {
        if (!s.points.length) return null;
        let best = s.points[0];
        for (const p of s.points) if (Math.abs(p.t - cursorT) < Math.abs(best.t - cursorT)) best = p;
        return { s, v: best.v };
      }).filter(Boolean) as { s: ChartSeries; v: number }[]
    : [];

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between gap-2 px-1 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-none">
          <span className="text-[12.5px] font-semibold whitespace-nowrap">{title}</span>
          <span className="tiny muted mono">[{unit}]</span>
          {badge}
        </div>
        <div className="flex items-center gap-3 tiny min-w-0 overflow-hidden justify-end flex-wrap">
          {series.some((s) => s.dashed) && <span className="muted whitespace-nowrap">- - - línea base</span>}
          {cursorVals.map(({ s, v }) => (
            <span key={s.id} className="flex items-center gap-1 mono whitespace-nowrap" style={{ color: s.color }}>
              <span className="inline-block w-3 h-[2px]" style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }} />
              {s.label}: {fmt(v, 3)}
            </span>
          ))}
        </div>
      </div>
      <div ref={ref} className="relative flex-1 min-h-0">
        {!hasData ? (
          <div className="grid place-content-center h-full small muted border border-dashed border-[var(--line)] rounded-md" style={{ height }}>
            Sin datos: ejecute un escenario para graficar esta variable.
          </div>
        ) : width > 0 && (
          <svg className="chart select-none" width={width} height={height} onPointerDown={handle} onPointerMove={handle} style={{ cursor: onSeek ? "crosshair" : "default" }}>
            <g className="grid">
              {yTicks.map((v) => <line key={v} x1={pad.l} x2={pad.l + plotW} y1={y(v)} y2={y(v)} />)}
            </g>
            {yTicks.map((v) => <text key={v} x={pad.l - 6} y={y(v) + 3} textAnchor="end">{v.toLocaleString("es-CO", { minimumFractionDigits: yDigits, maximumFractionDigits: yDigits })}</text>)}
            {xTicks.map((t) => <text key={t} x={x(t)} y={height - 6} textAnchor="middle">{fmt(t / 60, 0)}</text>)}
            <text x={pad.l - 6} y={height - 6} textAnchor="end" style={{ fill: "var(--text3)" }}>t [min]</text>
            {thresholds.map((th) => (
              <g key={th.label}>
                <line x1={pad.l} x2={pad.l + plotW} y1={y(th.value)} y2={y(th.value)} strokeDasharray="4 4" strokeOpacity={0.85} style={{ stroke: th.color }} />
                <text x={pad.l + plotW - 2} y={y(th.value) - 3} textAnchor="end" style={{ fill: th.color }}>{th.label} {fmt(th.value, 1)}</text>
              </g>
            ))}
            {markers.map((m, i) => (
              <line key={i} x1={x(m.t)} x2={x(m.t)} y1={pad.t} y2={pad.t + plotH} strokeOpacity={0.4} style={{ stroke: m.color }}>
                <title>{m.label}</title>
              </line>
            ))}
            {series.map((s) => (
              <polyline
                key={s.id}
                fill="none"
                style={{ stroke: s.color }}
                strokeWidth={s.dashed ? 1.4 : 1.9}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                strokeOpacity={s.dashed ? 0.65 : 1}
                points={s.points.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
              />
            ))}
            {cursorT !== undefined && (
              <line x1={x(cursorT)} x2={x(cursorT)} y1={pad.t} y2={pad.t + plotH} strokeOpacity={0.6} style={{ stroke: "var(--chart-cursor)" }} />
            )}
            <rect x={pad.l} y={pad.t} width={plotW} height={plotH} fill="none" style={{ stroke: "var(--chart-axis)" }} />
          </svg>
        )}
      </div>
    </div>
  );
}
