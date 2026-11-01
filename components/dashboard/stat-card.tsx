interface StatCardProps {
  label: string
  value: string
  unit?: string
  sub?: string
  alert?: boolean
}

export function StatCard({ label, value, unit, sub, alert = false }: StatCardProps) {
  return (
    <div
      className={`rounded-xl p-5 flex flex-col gap-1 border ${
        alert ? 'bg-red-100 border-red-300' : 'bg-white border-black/10'
      }`}
    >
      <span className="text-black/40 text-xs font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-brand-black">{value}</span>
        {unit && <span className="text-black/40 text-sm mb-1">{unit}</span>}
      </div>
      {sub && <span className="text-xs text-black/40">{sub}</span>}
    </div>
  )
}
