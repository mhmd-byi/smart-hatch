import { Schema, model, models } from 'mongoose'

// Mirrors the "royalhatch.readings.v1" payload. Field names match what the
// device sends, except `schema` -> `payload_schema` (`schema` is reserved by
// Mongoose). No defaults on purpose: a field the device did not send stays
// absent rather than being stored as 0/false.
const DeviceReadingSchema = new Schema({
  payload_schema: { type: String, required: true },
  device_id: { type: String, required: true },
  screen_session: String,
  sequence: Number,
  screen_firmware: String,
  screen_uptime_ms: Number,
  utc_unix_s: Number,
  controller_online: Boolean,
  controller_boot: String,
  controller_firmware: String,
  controller_uptime_ms: Number,
  sensors: {
    upper_temperature_c: Number,
    lower_temperature_c: Number,
    upper_humidity_pct: Number,
    lower_humidity_pct: Number,
    temperature_difference_c: Number,
    humidity_difference_points: Number,
  },
  batch: {
    species: String,
    day: Number,
    elapsed_s: Number,
    running: Boolean,
    lockdown: Boolean,
    finished: Boolean,
    target_temperature_c: Number,
    target_humidity_pct: Number,
  },
  equipment: {
    outputs_unlocked: Boolean,
    armed: Boolean,
    fan: Boolean,
    heater: Boolean,
    exhaust: Boolean,
    light: Boolean,
    door_open: Boolean,
    door_open_duration_ms: Number,
    actuator_direction: Number,
  },
  alarms: {
    overheat: Boolean,
    actuator_fault: Boolean,
    temperature_disagreement: Boolean,
    humidity_disagreement: Boolean,
  },
  received_at: { type: Date, default: () => new Date() },
})

DeviceReadingSchema.index({ device_id: 1, received_at: -1 })

const DeviceReading = models.DeviceReading ?? model('DeviceReading', DeviceReadingSchema)

export default DeviceReading
