import { NextRequest, NextResponse } from 'next/server'
import { authorizeManager } from '@/lib/manager/authorize'

export async function GET(request: NextRequest) {
  const auth = await authorizeManager(); if (!auth.ok) return auth.response
  const today = new Date(); const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const start = parseDate(request.nextUrl.searchParams.get('start')) || defaultStart
  const end = parseDate(request.nextUrl.searchParams.get('end')) || today
  end.setHours(23,59,59,999)
  if (end < start || end.getTime() - start.getTime() > 366 * 86400000) return NextResponse.json({ error: 'Choose a valid date range of up to one year.' }, { status: 400 })

  const [bookingsResult, roomsResult, itemsResult, maintenanceResult] = await Promise.all([
    auth.admin.from('bookings').select('id, total_amount, status, payment_status, booking_type, check_in_date, check_out_date, created_at'),
    auth.admin.from('rooms').select('id, room_type, is_active, status').eq('is_active', true),
    auth.admin.from('booking_items').select('booking_id, item_type, quantity, price_at_booking'),
    auth.admin.from('facility_maintenance').select('room_id, status').in('status', ['pending','in_progress']).not('room_id','is',null),
  ])
  if (bookingsResult.error) return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 })
  const bookings = bookingsResult.data || []; const rooms = roomsResult.data || []; const items = itemsResult.data || []
  const inPeriod = bookings.filter((booking) => { const created = new Date(booking.created_at); return created >= start && created <= end })
  const paid = inPeriod.filter((booking) => booking.payment_status === 'paid' && booking.status !== 'cancelled')
  const revenue = paid.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)
  const days = Math.max(1, Math.ceil((stripTime(end).getTime() - stripTime(start).getTime()) / 86400000) + 1)
  const maintenanceRooms = new Set((maintenanceResult.data || []).map((row) => row.room_id))
  const availableRoomNights = Math.max(0, rooms.length * days - maintenanceRooms.size * days)
  const roomItemCounts = new Map<string, number>()
  for (const item of items) if (item.item_type === 'room') roomItemCounts.set(item.booking_id, (roomItemCounts.get(item.booking_id) || 0) + Number(item.quantity || 1))
  let soldRoomNights = 0; let roomRevenue = 0
  for (const booking of bookings) {
    if (!['confirmed','completed'].includes(booking.status) || booking.payment_status !== 'paid' || !booking.check_in_date || !booking.check_out_date) continue
    const overlap = overlapNights(new Date(booking.check_in_date), new Date(booking.check_out_date), start, end)
    const roomCount = roomItemCounts.get(booking.id) || (booking.booking_type === 'room' ? 1 : 0)
    soldRoomNights += overlap * roomCount
    if (overlap > 0) roomRevenue += Number(booking.total_amount || 0)
  }
  const now = stripTime(new Date()); const tomorrow = new Date(now.getTime()+86400000)
  const arrivals = bookings.filter(b=>b.status==='confirmed'&&b.check_in_date&&stripTime(new Date(b.check_in_date)).getTime()===now.getTime()).length
  const departures = bookings.filter(b=>b.status==='confirmed'&&b.check_out_date&&stripTime(new Date(b.check_out_date)).getTime()===now.getTime()).length
  const inHouse = bookings.filter(b=>b.status==='confirmed'&&b.check_in_date&&b.check_out_date&&new Date(b.check_in_date)<=now&&new Date(b.check_out_date)>now).length
  const upcoming = bookings.filter(b=>b.status==='confirmed'&&b.check_in_date&&new Date(b.check_in_date)>=tomorrow).length
  const cancelled = inPeriod.filter(b=>b.status==='cancelled').length
  const daily = new Map<string,number>(); const breakdown = new Map<string,number>()
  for(const booking of paid){const key=String(booking.created_at).slice(0,10);daily.set(key,(daily.get(key)||0)+Number(booking.total_amount||0));const type=booking.booking_type||'other';breakdown.set(type,(breakdown.get(type)||0)+Number(booking.total_amount||0))}
  return NextResponse.json({ range:{start:start.toISOString(),end:end.toISOString(),days}, kpis:{revenue,totalBookings:inPeriod.length,paidBookings:paid.length,occupancyRate:availableRoomNights?Math.round(soldRoomNights/availableRoomNights*1000)/10:0,soldRoomNights,availableRoomNights,adr:soldRoomNights?Math.round(roomRevenue/soldRoomNights):0,revpar:availableRoomNights?Math.round(roomRevenue/availableRoomNights):0,cancellationRate:inPeriod.length?Math.round(cancelled/inPeriod.length*1000)/10:0,inHouse,arrivals,departures,upcoming}, dailyRevenue:[...daily.entries()].sort().map(([date,value])=>({date,value})), revenueBreakdown:[...breakdown.entries()].sort((a,b)=>b[1]-a[1]).map(([type,value])=>({type,value})) })
}

function parseDate(value:string|null){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?null:date}
function stripTime(date:Date){return new Date(date.getFullYear(),date.getMonth(),date.getDate())}
function overlapNights(checkIn:Date,checkOut:Date,start:Date,end:Date){const from=Math.max(stripTime(checkIn).getTime(),stripTime(start).getTime());const to=Math.min(stripTime(checkOut).getTime(),stripTime(end).getTime()+86400000);return Math.max(0,Math.ceil((to-from)/86400000))}
