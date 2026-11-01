import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import DeviceReading from '@/lib/models/DeviceReading'

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId')
  if (!deviceId) return Response.json({ error: 'deviceId is required' }, { status: 400 })

  await connectDB()

  const latest = await DeviceReading.findOne({ device_id: deviceId })
    .sort({ received_at: -1 })
    .select('-_id -__v')
    .lean()
  if (!latest) return Response.json({ error: 'No data found' }, { status: 404 })

  return Response.json(latest)
}
