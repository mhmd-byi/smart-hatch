import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import DeviceReading from '@/lib/models/DeviceReading'

const HOURS: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 }

// Each range is split into this many equal time buckets (5 min / 35 min / 2.5 h),
// so the response stays small no matter how often the device reports.
const BUCKETS = 288

const round = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100)

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const deviceId = searchParams.get('deviceId')
  if (!deviceId) return Response.json({ error: 'deviceId is required' }, { status: 400 })

  const rangeMs = (HOURS[searchParams.get('range') ?? '24h'] ?? 24) * 60 * 60 * 1000
  const bucketMs = rangeMs / BUCKETS
  const since = new Date(Date.now() - rangeMs)

  await connectDB()

  const rows = await DeviceReading.aggregate([
    { $match: { device_id: deviceId, received_at: { $gte: since } } },
    {
      $group: {
        // Start of the bucket in epoch ms
        _id: { $subtract: [{ $toLong: '$received_at' }, { $mod: [{ $toLong: '$received_at' }, bucketMs] }] },
        upperTemp: { $avg: '$sensors.upper_temperature_c' },
        lowerTemp: { $avg: '$sensors.lower_temperature_c' },
        upperHumidity: { $avg: '$sensors.upper_humidity_pct' },
        lowerHumidity: { $avg: '$sensors.lower_humidity_pct' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  return Response.json(
    rows.map((r) => ({
      time: new Date(r._id).toISOString(),
      upperTemp: round(r.upperTemp),
      lowerTemp: round(r.lowerTemp),
      upperHumidity: round(r.upperHumidity),
      lowerHumidity: round(r.lowerHumidity),
    }))
  )
}
