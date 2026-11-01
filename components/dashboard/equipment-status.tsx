import { formatDuration } from '@/lib/format'
import type { Equipment } from '@/lib/types'

type FlagKey = 'fan' | 'heater' | 'exhaust' | 'light' | 'door_open' | 'armed' | 'outputs_unlocked'

const indicators: { key: FlagKey; label: string; on: string; off: string }[] = [
  { key: 'fan', label: 'Fan', on: 'Running', off: 'Off' },
  { key: 'heater', label: 'Heater', on: 'On', off: 'Off' },
  { key: 'exhaust', label: 'Exhaust', on: 'On', off: 'Off' },
  { key: 'light', label: 'Light', on: 'On', off: 'Off' },
  { key: 'door_open', label: 'Door', on: 'Open', off: 'Closed' },
  { key: 'armed', label: 'Controller', on: 'Armed', off: 'Disarmed' },
  { key: 'outputs_unlocked', label: 'Outputs', on: 'Unlocked', off: 'Locked' },
]

function Tile({ label, text, active }: { label: string; text: string; active: boolean }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 flex flex-col gap-1 border ${
        active ? 'bg-brand-yellow border-brand-yellow' : 'bg-white border-black/10'
      }`}
    >
      <span className="text-black/40 text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${active ? 'bg-brand-black' : 'bg-black/15'}`} />
        <span className={`text-sm font-medium ${active ? 'text-brand-black' : 'text-black/30'}`}>{text}</span>
      </div>
    </div>
  )
}

export function EquipmentStatus({ data }: { data: Equipment }) {
  const direction = data.actuator_direction
  const doorText = data.door_open
    ? data.door_open_duration_ms
      ? `Open · ${formatDuration(data.door_open_duration_ms)}`
      : 'Open'
    : 'Closed'

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <h3 className="text-black/40 text-xs font-medium uppercase tracking-wider mb-4">Equipment Status</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {indicators.map(({ key, label, on, off }) => {
          const value = data[key]
          const text = value === undefined ? '—' : key === 'door_open' ? doorText : value ? on : off
          return <Tile key={key} label={label} text={text} active={value === true} />
        })}
        <Tile
          label="Actuator"
          text={typeof direction !== 'number' ? '—' : direction === 0 ? 'Idle' : `Direction ${direction > 0 ? '+' : ''}${direction}`}
          active={typeof direction === 'number' && direction !== 0}
        />
      </div>
    </div>
  )
}
