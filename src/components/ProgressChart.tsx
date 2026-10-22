import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { dayNumber, linear, nearestIndex, niceScale } from '../lib/chart';
import { formatDateHe, formatKg } from '../lib/format';
import type { ProgressPoint } from '../lib/stats';
import type { EquipmentType } from '../types';
import { formatSet } from './common';

const H = 220;
const M = { top: 26, right: 16, bottom: 28, left: 44 };

interface Props {
  points: ProgressPoint[];
  equipment: EquipmentType;
}

/**
 * Best estimated 1RM per workout date. Time runs left to right even in the
 * RTL layout. A crosshair snaps to the nearest date on hover/tap; arrow keys
 * do the same when the chart has focus. Every value is also in the sessions
 * list below the chart, so the readout never gates data.
 */
export function ProgressChart({ points, equipment }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number>(points.length - 1);
  const activeIndex = Math.min(Math.max(active, 0), points.length - 1);

  // Draw in real CSS pixels (viewBox = rendered width) so axis text keeps its
  // size on a phone instead of shrinking with a scaled-down viewBox.
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setW(Math.max(240, Math.round(el.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geo = useMemo(() => {
    const days = points.map((p) => dayNumber(p.date));
    const values = points.map((p) => p.oneRepMax);
    const scale = niceScale(Math.min(...values), Math.max(...values));
    const x = linear(days[0] ?? 0, days[days.length - 1] ?? 0, M.left, W - M.right);
    const y = linear(scale.min, scale.max, H - M.bottom, M.top);
    const xs = days.map(x);
    const ys = values.map(y);
    const line = xs.map((px, i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${ys[i]!.toFixed(1)}`).join(' ');
    const area =
      xs.length > 1
        ? `${line} L${xs[xs.length - 1]!.toFixed(1)},${H - M.bottom} L${xs[0]!.toFixed(1)},${H - M.bottom} Z`
        : '';
    let maxIndex = 0;
    values.forEach((v, i) => {
      if (v > (values[maxIndex] ?? -Infinity)) maxIndex = i;
    });
    return { scale, xs, ys, y, line, area, maxIndex };
  }, [points, W]);

  if (points.length === 0) return null;

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    setActive(nearestIndex(geo.xs, svgX));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setActive(Math.min(activeIndex + 1, points.length - 1));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setActive(Math.max(activeIndex - 1, 0));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(points.length - 1);
    else return;
    e.preventDefault();
  };

  const current = points[activeIndex]!;
  const last = points.length - 1;
  const ax = geo.xs[activeIndex]!;
  const labelled = new Set([last, geo.maxIndex]);

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="chart-readout" aria-live="polite">
        <span className="chart-readout__key" aria-hidden="true" />
        <span className="chart-readout__value">{formatKg(current.oneRepMax)} ק"ג</span>
        <span className="chart-readout__meta">
          {formatDateHe(current.date)} · <bdi>{formatSet(current.set, equipment)}</bdi>
          {activeIndex === geo.maxIndex && points.length > 1 && ' · שיא'}
        </span>
      </div>
      <div
        ref={wrapRef}
        className="chart-wrap"
        tabIndex={0}
        role="group"
        aria-label={`גרף 1RM משוער לאורך זמן, ${points.length} נקודות. חצים לניווט בין התאריכים.`}
        onKeyDown={onKey}
      >
        <svg ref={svgRef} className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          {geo.scale.ticks.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={M.left} x2={W - M.right} y1={geo.y(t)} y2={geo.y(t)} />
              <text className="chart__axis-label" x={M.left - 8} y={geo.y(t) + 4} textAnchor="end">
                {formatKg(t)}
              </text>
            </g>
          ))}

          <text className="chart__axis-label" x={geo.xs[0]} y={H - 8} textAnchor={points.length > 1 ? 'start' : 'middle'}>
            {formatDateHe(points[0]!.date)}
          </text>
          {points.length > 1 && (
            <text className="chart__axis-label" x={geo.xs[last]} y={H - 8} textAnchor="end">
              {formatDateHe(points[last]!.date)}
            </text>
          )}

          {geo.area && <path className="chart__area" d={geo.area} />}
          {points.length > 1 && <path className="chart__line" d={geo.line} />}

          <line className="chart__crosshair" x1={ax} x2={ax} y1={M.top - 6} y2={H - M.bottom} />

          {geo.xs.map((px, i) => (
            <circle key={points[i]!.date} className="chart__dot" cx={px} cy={geo.ys[i]} r={i === activeIndex ? 6 : 4} />
          ))}

          {[...labelled].map((i) => {
            const anchor = points.length > 1 && i === last ? 'end' : points.length > 1 && i === 0 ? 'start' : 'middle';
            const dx = anchor === 'end' ? -6 : anchor === 'start' ? 6 : 0;
            return (
              <text
                key={`label-${i}`}
                className="chart__value-label"
                x={geo.xs[i]! + dx}
                y={geo.ys[i]! - 12}
                textAnchor={anchor}
              >
                {formatKg(points[i]!.oneRepMax)}
              </text>
            );
          })}

          <rect
            className="chart__hit"
            x={M.left - 12}
            y={0}
            width={W - M.left - M.right + 24}
            height={H}
            onPointerMove={pick}
            onPointerDown={pick}
          />
        </svg>
      </div>
    </div>
  );
}
