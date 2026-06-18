'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, startOfDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  checkIn: string
  checkOut: string
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
  disabledDates?: Date[]
}

export function DatePicker({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  disabledDates = [],
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>({
    from: checkIn ? new Date(checkIn + 'T00:00:00') : undefined,
    to: checkOut ? new Date(checkOut + 'T00:00:00') : undefined,
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (selectedRange: DateRange | undefined) => {
    setRange(selectedRange)
    if (selectedRange?.from) {
      onCheckInChange(format(selectedRange.from, 'yyyy-MM-dd'))
    }
    if (selectedRange?.to) {
      onCheckOutChange(format(selectedRange.to, 'yyyy-MM-dd'))
      setIsOpen(false)
    }
  }

  const today = startOfDay(new Date())
  const nights = range?.from && range?.to
    ? Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:border-[#0A3D62] transition-colors bg-white text-left text-gray-900"
        >
        <CalendarIcon className="w-5 h-5 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          {checkIn && checkOut ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-900 font-medium">
                {format(new Date(checkIn + 'T00:00:00'), 'MMM d')} — {format(new Date(checkOut + 'T00:00:00'), 'MMM d, yyyy')}
              </span>
              {nights > 0 && (
                <span className="text-blue-600 font-medium">{nights} night{nights > 1 ? 's' : ''}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Select check-in and check-out dates</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 top-full left-0">
          <style>{`
            .rdp { --rdp-cell-size: 36px; --rdp-accent-color: #2563eb; --rdp-background-color: #eff6ff; margin: 0; }
            .rdp-months { display: flex; gap: 1rem; }
            .rdp-month { margin: 0; }
            .rdp-caption { display: flex; justify-content: center; align-items: center; position: relative; padding: 0 0 0.5rem; }
            .rdp-caption_label { font-size: 0.875rem; font-weight: 500; }
            .rdp-nav { display: flex; gap: 0.25rem; }
            .rdp-nav_button { width: 28px; height: 28px; border: 1px solid #e5e7eb; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
            .rdp-nav_button_previous { position: absolute; left: 0; }
            .rdp-nav_button_next { position: absolute; right: 0; }
            .rdp-table { width: 100%; }
            .rdp-head_cell { font-size: 0.75rem; color: #6b7280; font-weight: 400; }
            .rdp-day { width: 36px; height: 36px; border-radius: 6px; font-size: 0.875rem; color: #111827; }
            .rdp-day_selected { background-color: #2563eb; color: white; }
            .rdp-day_today { background-color: #eff6ff; color: #2563eb; font-weight: 700; }
            .rdp-day_outside { color: #d1d5db; opacity: 0.5; }
            .rdp-day_disabled { color: #d1d5db; opacity: 0.5; }
          `}</style>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            disabled={[{ before: today }, ...disabledDates]}
            numberOfMonths={2}
            showOutsideDays
          />
        </div>
      )}
    </div>
  )
}