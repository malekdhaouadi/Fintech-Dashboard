import { useMemo } from 'react'

const HARDCODED_EVENTS = [
  { dayOffset: 0, time: '14:30', event: 'US Core CPI (MoM)', impact: 'High' },
  { dayOffset: 1, time: '13:15', event: 'ECB Interest Rate Decision', impact: 'High' },
  { dayOffset: 1, time: '14:30', event: 'US Initial Jobless Claims', impact: 'Medium' },
  { dayOffset: 2, time: '10:00', event: 'Eurozone GDP (YoY)', impact: 'High' },
  { dayOffset: 3, time: '09:30', event: 'UK Services PMI', impact: 'Low' },
  { dayOffset: 4, time: '14:00', event: 'Fed Chair Powell Speaks', impact: 'High' },
  { dayOffset: 6, time: '16:00', event: 'US Existing Home Sales', impact: 'Medium' },
]

const IMPACT_COLORS = {
  High: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  Medium: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]',
  Low: 'bg-gray-500',
}

export default function EconomicCalendar() {
  const events = useMemo(() => {
    const today = new Date()
    return HARDCODED_EVENTS.map(ev => {
      const d = new Date(today)
      d.setDate(today.getDate() + ev.dayOffset)
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      return { ...ev, dateStr }
    })
  }, [])

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur-sm">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Upcoming</p>
        <h2 className="mt-2 text-lg font-bold text-white">Economic Calendar</h2>
      </div>
      <div className="flex flex-col gap-3">
        {events.map((ev, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-800/50 bg-gray-950/50 p-3 transition-colors hover:bg-gray-800/50">
            <div className="flex w-16 flex-col text-center">
              <span className="text-xs font-semibold text-gray-300">{ev.dateStr.split(',')[0]}</span>
              <span className="text-[10px] text-gray-500">{ev.time}</span>
            </div>
            <div className="h-8 w-px bg-gray-800" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{ev.event}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">{ev.impact}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${IMPACT_COLORS[ev.impact]}`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
