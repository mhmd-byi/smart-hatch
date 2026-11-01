'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { EquipmentStatus } from '@/components/dashboard/equipment-status'
import type { ChartSeries } from '@/components/dashboard/reading-chart'
import { fmt, formatDuration } from '@/lib/format'
import type { ChartPoint, HatchDevice, Range, Reading } from '@/lib/types'

const ReadingChart = dynamic(
  () => import('@/components/dashboard/reading-chart').then((m) => m.ReadingChart),
  { ssr: false }
)

const RANGES: Range[] = ['24h', '7d', '30d']

const TEMP_SERIES: ChartSeries[] = [
  { key: 'upperTemp', label: 'Upper', color: '#F3BB44' },
  { key: 'lowerTemp', label: 'Lower', color: '#221F20' },
]
const HUMIDITY_SERIES: ChartSeries[] = [
  { key: 'upperHumidity', label: 'Upper', color: '#F3BB44' },
  { key: 'lowerHumidity', label: 'Lower', color: '#221F20' },
]

interface LoadedData {
  key: string
  deviceId: string
  stats: Reading
  readings: ChartPoint[]
  fetchedAt: Date
}

const requestKey = (deviceId: string, range: Range, refresh: number) => `${deviceId}|${range}|${refresh}`

function agoLabel(ms: number) {
  return ms < 60_000 ? 'just now' : `${formatDuration(ms)} ago`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-black/40 text-xs">{label}</span>
      <span className="text-brand-black text-sm">{children}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<HatchDevice[] | null>(null)
  const [selectedDevice, setSelectedDevice] = useState('')
  const [range, setRange] = useState<Range>('24h')
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState<LoadedData | null>(null)
  const [error, setError] = useState('')

  // Device list (re-fetched on manual refresh so newly reporting devices appear)
  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/devices')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: HatchDevice[]) => {
        if (cancelled) return
        setDevices(list)
        setSelectedDevice((current) => current || list[0]?.deviceId || '')
      })
      .catch(() => {
        if (!cancelled) setError('Could not load devices. Try refreshing.')
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Latest reading + chart series for the selected device and range
  useEffect(() => {
    if (!selectedDevice) return
    let cancelled = false
    const key = requestKey(selectedDevice, range, refresh)
    const id = encodeURIComponent(selectedDevice)

    Promise.all([
      fetch(`/api/dashboard/stats?deviceId=${id}`),
      fetch(`/api/dashboard/readings?deviceId=${id}&range=${range}`),
    ])
      .then(async ([statsRes, readingsRes]) => {
        if (!statsRes.ok || !readingsRes.ok) throw new Error('bad response')
        const [stats, readings] = await Promise.all([statsRes.json(), readingsRes.json()])
        if (cancelled) return
        setData({ key, deviceId: selectedDevice, stats, readings, fetchedAt: new Date() })
        setError('')
      })
      .catch(() => {
        if (!cancelled) setError('Could not load device data. Try refreshing.')
      })
    return () => {
      cancelled = true
    }
  }, [selectedDevice, range, refresh])

  const loading = !!selectedDevice && data?.key !== requestKey(selectedDevice, range, refresh)
  const current = data && data.deviceId === selectedDevice ? data : null
  const stats = current?.stats
  const { sensors, batch, equipment, alarms } = stats ?? {}

  const criticalAlerts = [
    stats?.controller_online === false && 'Controller offline. Sensor and equipment values may be missing or outdated.',
    alarms?.overheat && 'Overheat alarm. Immediate attention required.',
    alarms?.actuator_fault && 'Actuator fault. Immediate attention required.',
  ].filter((a): a is string => !!a)

  const warnings = [
    alarms?.temperature_disagreement && 'Temperature Sensors Disagree',
    alarms?.humidity_disagreement && 'Humidity Sensors Disagree',
  ].filter((a): a is string => !!a)

  const batchStatus = batch?.finished ? 'Finished' : batch?.lockdown ? 'Lockdown' : batch?.running ? 'Running' : 'Not running'
  const tempTarget = batch?.target_temperature_c
  const humidityTarget = batch?.target_humidity_pct
  const tempSub = typeof tempTarget === 'number' ? `Target: ${tempTarget} °C` : undefined
  const humiditySub = typeof humidityTarget === 'number' ? `Target: ${humidityTarget} %` : undefined

  if (devices && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center">
          <Wifi className="w-6 h-6 text-black/20" />
        </div>
        <div className="text-center">
          <h2 className="text-brand-black font-semibold text-lg">No device data yet</h2>
          <p className="text-black/40 text-sm mt-1">Devices appear here after they send their first reading.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-brand-black text-2xl font-bold">Dashboard</h1>
          {selectedDevice && (
            <p className="text-black/40 text-sm mt-0.5">
              {selectedDevice}
              {batch?.species ? ` — ${capitalize(batch.species)}` : ''}
              {typeof batch?.day === 'number' ? `, day ${batch.day}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {devices && devices.length > 1 && (
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-white border border-black/20 text-brand-black text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg overflow-hidden border border-black/15">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  range === r ? 'bg-brand-yellow text-brand-black' : 'bg-white text-black/50 hover:text-brand-black hover:bg-black/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRefresh((n) => n + 1)}
            disabled={loading}
            aria-label="Refresh"
            className="border border-black/15 text-black/50 hover:text-brand-black hover:border-black/30 bg-white rounded-lg p-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {current && (
        <p className="text-black/30 text-xs -mt-2">
          Last updated: {current.fetchedAt.toLocaleTimeString()} · Last reading:{' '}
          {agoLabel(current.fetchedAt.getTime() - new Date(current.stats.received_at).getTime())}
        </p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm font-medium">{error}</div>
      )}

      {/* Critical alerts */}
      {criticalAlerts.map((message) => (
        <div key={message} className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
          <span className="text-red-700 font-medium">{message}</span>
        </div>
      ))}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {warnings.map((w) => (
            <span key={w} className="flex items-center gap-1.5 bg-brand-yellow text-brand-black text-xs font-semibold px-3 py-1.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {w}
            </span>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Upper Temp" value={fmt(sensors?.upper_temperature_c)} unit="°C" sub={tempSub} alert={alarms?.overheat} />
          <StatCard label="Lower Temp" value={fmt(sensors?.lower_temperature_c)} unit="°C" sub={tempSub} alert={alarms?.overheat} />
          <StatCard label="Upper Humidity" value={fmt(sensors?.upper_humidity_pct)} unit="%" sub={humiditySub} />
          <StatCard label="Lower Humidity" value={fmt(sensors?.lower_humidity_pct)} unit="%" sub={humiditySub} />
          <StatCard label="Temp Difference" value={fmt(sensors?.temperature_difference_c)} unit="°C" sub="Between sensors" alert={alarms?.temperature_disagreement} />
          <StatCard label="Humidity Difference" value={fmt(sensors?.humidity_difference_points)} unit="pts" sub="Between sensors" alert={alarms?.humidity_disagreement} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-black/5 border border-black/10 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* Charts */}
      {current ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReadingChart title="Temperature" data={current.readings} series={TEMP_SERIES} unit="°C" referenceValue={tempTarget} range={range} />
          <ReadingChart title="Humidity" data={current.readings} series={HUMIDITY_SERIES} unit="%" referenceValue={humidityTarget} range={range} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-black/5 border border-black/10 h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* Equipment status */}
      {equipment && <EquipmentStatus data={equipment} />}

      {/* Batch + device info */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h3 className="text-black/40 text-xs font-medium uppercase tracking-wider mb-4">Batch</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Species">{batch?.species ? capitalize(batch.species) : '—'}</Field>
              <Field label="Day">{fmt(batch?.day, 0)}</Field>
              <Field label="Elapsed">{typeof batch?.elapsed_s === 'number' ? formatDuration(batch.elapsed_s * 1000) : '—'}</Field>
              <Field label="Status">{batchStatus}</Field>
              <Field label="Target Temp">{typeof tempTarget === 'number' ? `${tempTarget} °C` : '—'}</Field>
              <Field label="Target Humidity">{typeof humidityTarget === 'number' ? `${humidityTarget} %` : '—'}</Field>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h3 className="text-black/40 text-xs font-medium uppercase tracking-wider mb-4">Device Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Controller">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stats.controller_online ? 'bg-brand-yellow' : 'bg-black/15'}`} />
                  {stats.controller_online === undefined ? '—' : stats.controller_online ? 'Online' : 'Offline'}
                </span>
              </Field>
              <Field label="Screen Firmware">{stats.screen_firmware ?? '—'}</Field>
              <Field label="Controller Firmware">{stats.controller_firmware ?? '—'}</Field>
              <Field label="Screen Uptime">{formatDuration(stats.screen_uptime_ms)}</Field>
              <Field label="Controller Uptime">{formatDuration(stats.controller_uptime_ms)}</Field>
              <Field label="Controller Boot">
                <span className="font-mono">{stats.controller_boot ?? '—'}</span>
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
