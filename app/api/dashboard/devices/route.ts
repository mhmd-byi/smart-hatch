import { connectDB } from '@/lib/db'
import DeviceReading from '@/lib/models/DeviceReading'

// Devices are not registered anywhere: any device_id that has sent a reading is listed.
export async function GET() {
  await connectDB()

  // Sort matches the { device_id, received_at } index, so Mongo can answer this
  // with a distinct scan instead of reading every reading.
  const rows = await DeviceReading.aggregate([
    { $sort: { device_id: 1, received_at: -1 } },
    { $group: { _id: '$device_id', lastSeen: { $first: '$received_at' } } },
    { $sort: { lastSeen: -1 } },
  ])

  return Response.json(rows.map((r) => ({ deviceId: r._id, lastSeen: r.lastSeen })))
}
