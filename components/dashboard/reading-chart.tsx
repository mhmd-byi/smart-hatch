'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { ChartPoint, Range } from '@/lib/types'

export interface ChartSeries {
  key: Exclude<keyof ChartPoint, 'time'>
  label: string
  color: string
}

interface ReadingChartProps {
  title: string
  data: ChartPoint[]
  series: ChartSeries[]
  unit: string
  referenceValue?: number | null
  range: Range
}

function formatTime(isoString: string, range: Range) {
  const d = new Date(isoString)
  if (range === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (range === '7d') return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ReadingChart({ title, data, series, unit, referenceValue, range }: ReadingChartProps) {
  const formatted = data.map((r) => ({ ...r, label: formatTime(r.time, range) }))
  const target = typeof referenceValue === 'number' ? referenceValue : undefined

  const vals = formatted.flatMap((d) =>
    series.map((s) => d[s.key]).filter((v): v is number => typeof v === 'number')
  )
  if (target !== undefined) vals.push(target)

  if (vals.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-5 h-64 flex items-center justify-center">
        <span className="text-black/30 text-sm">No data for this range</span>
      </div>
    )
  }

  const dataMin = Math.min(...vals)
  const dataMax = Math.max(...vals)
  const dataRange = dataMax - dataMin || 1
  const yMin = dataMin - dataRange * 0.15
  const yMax = dataMax + dataRange * 0.15

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-black/40 text-xs font-medium uppercase tracking-wider">{title}</h3>
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-black/50">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 4, right: 20, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(0,0,0,0.35)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: 'rgba(0,0,0,0.35)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
            unit={unit ? ` ${unit}` : ''}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 8,
              color: '#221F20',
              fontSize: 12,
            }}
            labelStyle={{ color: 'rgba(0,0,0,0.4)' }}
            formatter={(val: unknown, name: unknown) => [
              typeof val === 'number' ? `${val.toFixed(2)}${unit ? ' ' + unit : ''}` : '—',
              String(name),
            ]}
          />
          {target !== undefined && (
            <ReferenceLine
              y={target}
              stroke="rgba(0,0,0,0.2)"
              strokeDasharray="4 4"
              label={{ value: `Target: ${target}`, fill: 'rgba(0,0,0,0.35)', fontSize: 10, position: 'insideTopRight' }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: s.color, stroke: '#221F20', strokeWidth: 1.5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
