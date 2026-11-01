import { timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import DeviceReading from '@/lib/models/DeviceReading'

const SUPPORTED_SCHEMA = 'royalhatch.readings.v1'

function hasValidApiKey(request: NextRequest) {
  const provided = request.headers.get('x-api-key')
  const expected = process.env.DEVICE_API_KEY
  if (!provided || !expected) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!hasValidApiKey(request)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return Response.json({ success: false, error: 'Body must be a JSON object' }, { status: 400 })
  }

  const { schema, ...reading } = body as Record<string, unknown>

  if (schema !== SUPPORTED_SCHEMA) {
    return Response.json(
      { success: false, error: `Unsupported schema, expected "${SUPPORTED_SCHEMA}"` },
      { status: 400 }
    )
  }

  if (typeof reading.device_id !== 'string' || !reading.device_id.trim()) {
    return Response.json({ success: false, error: 'device_id is required' }, { status: 400 })
  }

  try {
    await connectDB()
    await DeviceReading.create({
      ...reading,
      payload_schema: schema,
      received_at: new Date(),
    })
    return Response.json({ success: true }, { status: 201 })
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return Response.json({ success: false, error: err.message }, { status: 400 })
    }
    console.error('[ingest]', err)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
