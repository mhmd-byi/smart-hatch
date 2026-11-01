// Demo data for the dashboard.
//
//   npm run seed:demo          insert ~7 days of simulated readings (replaces any existing demo data)
//   npm run seed:demo:remove   delete all demo data
//
// Every demo document has a device_id starting with "demo-", and this script only ever
// touches documents matching that prefix, so real device readings are never modified.
// Run `npm run seed:demo:remove` once real devices are reporting.

import mongoose from 'mongoose'

const DEMO_DEVICE_ID = 'demo-royalhatch-0001'
const DEMO_FILTER = { device_id: { $regex: '^demo-' } }

const DAYS = 7
const STEP_MS = 5 * 60 * 1000
const STEPS_PER_DAY = (24 * 60 * 60 * 1000) / STEP_MS
const TARGET_TEMP = 37.5
const TARGET_HUMIDITY = 55

const noise = (amplitude) => (Math.random() * 2 - 1) * amplitude
const round1 = (v) => Math.round(v * 10) / 10

// Simulates a thermostat (heater cycling around the target), a humidity exhaust,
// and a few door openings per day. Document shape matches DeviceReading / royalhatch.readings.v1.
function buildReadings() {
  const total = DAYS * STEPS_PER_DAY
  const now = Date.now()
  const firstAt = now - (total - 1) * STEP_MS
  const batchStart = firstAt - 0.5 * 24 * 60 * 60 * 1000 // so the newest reading is on day 8

  // ~3 door openings per day, never within the last few readings
  const doorSteps = new Set()
  for (let d = 0; d < DAYS; d++) {
    for (let k = 0; k < 3; k++) {
      const step = Math.floor(d * STEPS_PER_DAY + 40 + k * 90 + Math.random() * 30)
      if (step < total - 4) doorSteps.add(step)
    }
  }

  let temp = TARGET_TEMP
  let humidity = TARGET_HUMIDITY
  let heater = false
  let exhaust = false
  const docs = []

  for (let i = 0; i < total; i++) {
    const at = firstAt + i * STEP_MS
    const doorOpen = doorSteps.has(i)

    if (doorOpen) {
      temp -= 0.7 + noise(0.2)
      humidity -= 5 + noise(1.5)
    }

    if (temp < TARGET_TEMP - 0.15) heater = true
    else if (temp > TARGET_TEMP + 0.15) heater = false
    temp += (heater ? 0.07 : -0.05) + noise(0.02)

    if (humidity > TARGET_HUMIDITY + 1.5) exhaust = true
    else if (humidity < TARGET_HUMIDITY - 0.5) exhaust = false
    humidity += (TARGET_HUMIDITY - humidity) * 0.1 + (exhaust ? -0.8 : 0.3) + noise(0.3)

    const upperTemp = round1(temp + 0.05 + noise(0.03))
    const lowerTemp = round1(temp - 0.05 + noise(0.03))
    const upperHumidity = round1(humidity + 0.25)
    const lowerHumidity = round1(humidity - 0.25)
    const elapsedS = Math.floor((at - batchStart) / 1000)

    docs.push({
      payload_schema: 'royalhatch.readings.v1',
      device_id: DEMO_DEVICE_ID,
      screen_session: '0123456789abcdef',
      sequence: i + 1,
      screen_firmware: '2.3.0',
      screen_uptime_ms: at - firstAt,
      utc_unix_s: Math.floor(at / 1000),
      controller_online: true,
      controller_boot: 'boot-001',
      controller_firmware: '1.0.0',
      controller_uptime_ms: at - firstAt,
      sensors: {
        upper_temperature_c: upperTemp,
        lower_temperature_c: lowerTemp,
        upper_humidity_pct: upperHumidity,
        lower_humidity_pct: lowerHumidity,
        temperature_difference_c: round1(Math.abs(upperTemp - lowerTemp)),
        humidity_difference_points: round1(Math.abs(upperHumidity - lowerHumidity)),
      },
      batch: {
        species: 'chicken',
        day: Math.floor(elapsedS / 86400) + 1,
        elapsed_s: elapsedS,
        running: true,
        lockdown: false,
        finished: false,
        target_temperature_c: TARGET_TEMP,
        target_humidity_pct: TARGET_HUMIDITY,
      },
      equipment: {
        outputs_unlocked: true,
        armed: true,
        fan: true,
        heater,
        exhaust,
        light: doorOpen,
        door_open: doorOpen,
        door_open_duration_ms: doorOpen ? 120000 : 0,
        actuator_direction: 0,
      },
      alarms: {
        overheat: false,
        actuator_fault: false,
        temperature_disagreement: false,
        humidity_disagreement: false,
      },
      received_at: new Date(at),
    })
  }

  return docs
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set. Run this through npm (npm run seed:demo).')

  await mongoose.connect(uri)
  const readings = mongoose.connection.db.collection('devicereadings')

  const removed = await readings.deleteMany(DEMO_FILTER)
  console.log(`Removed ${removed.deletedCount} existing demo reading(s).`)

  if (process.argv.includes('--remove')) return

  const docs = buildReadings()
  for (let i = 0; i < docs.length; i += 1000) {
    await readings.insertMany(docs.slice(i, i + 1000), { ordered: false })
  }
  console.log(`Inserted ${docs.length} demo reading(s) for device "${DEMO_DEVICE_ID}".`)
  console.log('Remove them any time with: npm run seed:demo:remove')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
