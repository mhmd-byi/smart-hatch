import { Egg } from 'lucide-react'

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-brand-black px-6 py-4 flex items-center gap-2">
        <Egg className="text-brand-yellow w-5 h-5" />
        <span className="text-white font-bold text-lg tracking-tight">Smart Hatch</span>
      </header>
      <main className="px-4 sm:px-6 pt-8 pb-8 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
