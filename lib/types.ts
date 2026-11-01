export type Range = '24h' | '7d' | '30d'

type Num = number | null

// Latest reading as returned by /api/dashboard/stats. Mirrors the
// "royalhatch.readings.v1" payload; every field is optional because the device
// omits what it cannot measure (e.g. sensors while the controller is offline).
export interface Reading {
  device_id: string
  screen_firmware?: string
  screen_uptime_ms?: number
  controller_online?: boolean
  controller_boot?: string
  controller_firmware?: string
  controller_uptime_ms?: number
  sensors?: {
    upper_temperature_c?: Num
    lower_temperature_c?: Num
    upper_humidity_pct?: Num
    lower_humidity_pct?: Num
    temperature_difference_c?: Num
    humidity_difference_points?: Num
  }
  batch?: {
    species?: string
    day?: Num
    elapsed_s?: Num
    running?: boolean
    lockdown?: boolean
    finished?: boolean
    target_temperature_c?: Num
    target_humidity_pct?: Num
  }
  equipment?: Equipment
  alarms?: {
    overheat?: boolean
    actuator_fault?: boolean
    temperature_disagreement?: boolean
    humidity_disagreement?: boolean
  }
  received_at: string
}

export interface Equipment {
  outputs_unlocked?: boolean
  armed?: boolean
  fan?: boolean
  heater?: boolean
  exhaust?: boolean
  light?: boolean
  door_open?: boolean
  door_open_duration_ms?: Num
  actuator_direction?: Num
}

export interface HatchDevice {
  deviceId: string
  lastSeen: string
}

// One time bucket from /api/dashboard/readings (values are bucket averages).
export interface ChartPoint {
  time: string
  upperTemp: Num
  lowerTemp: Num
  upperHumidity: Num
  lowerHumidity: Num
}
