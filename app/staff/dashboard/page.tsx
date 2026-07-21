import { redirect } from "next/navigation"
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server"
import { format } from "date-fns"
import Link from "next/link"
import { CalendarPlus, LogIn, CheckCircle2, BedDouble, Check } from "lucide-react"
import RoomOperationsTable, { type OperationalRoom } from "@/components/staff/RoomOperationsTable"

interface Room {
  id: string
  room_number: string
  room_type: string
  price_per_night: number | null
  status: string | null
  housekeeping_status: 'available' | 'dirty' | 'cleaning' | 'inspected'
}

interface BookingItem {
  item_type: string
  item_id: string
}

interface ActiveBooking {
  guest_name: string | null
  check_in_date: string | null
  check_out_date: string | null
  booking_items: BookingItem[] | null
}

export default async function StaffDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?redirect=/staff/dashboard")

  const admin = createAdminClient()
  const { data: userRole } = await admin.from("user_roles").select("role, is_active").eq("user_id", user.id).single()
  if (userRole?.role !== "front_desk" || userRole.is_active === false) redirect("/login")

  const today = format(new Date(), "yyyy-MM-dd")
  const { data: allRooms } = await admin.from("rooms").select("*").eq("is_active", true).order("room_number")
  const rooms = (allRooms || []) as Room[]
  const { data: arrivals } = await admin.from("bookings").select("*").eq("check_in_date", today).in("status", ["confirmed", "pending"]).is("checked_in_at", null)
  const { data: checkedIn } = await admin.from("bookings").select("*").not("checked_in_at", "is", null).is("checked_out_at", null)
  const { data: activeBookings } = await admin.from("bookings").select("*, booking_items(*)").not("checked_in_at", "is", null).is("checked_out_at", null).order("check_in_date", { ascending: true })
  const bookings = (activeBookings || []) as ActiveBooking[]
  const operationalRooms: OperationalRoom[] = rooms.map((room) => {
    const booking = bookings.find((item) => item.booking_items?.some((bookingItem) => bookingItem.item_type === "room" && bookingItem.item_id === room.id))
    return { id: room.id, roomNumber: room.room_number, roomType: room.room_type, pricePerNight: room.price_per_night,
      operationalStatus: room.status, housekeepingStatus: room.housekeeping_status || 'available', guestName: booking?.guest_name || null,
      checkInDate: booking?.check_in_date || null, checkOutDate: booking?.check_out_date || null, occupied: Boolean(booking) }
  })
  const availableRooms = operationalRooms.filter((room) => !room.occupied && room.operationalStatus === 'available' && room.housekeepingStatus === 'available')

  const stats = [
    { label: "Available Rooms", value: availableRooms.length, icon: Check, color: "bg-green-50 text-green-700", iconColor: "text-green-500" },
    { label: "Occupied Rooms", value: bookings.length, icon: BedDouble, color: "bg-red-50 text-red-700", iconColor: "text-red-500" },
    { label: "Today Arrivals", value: arrivals?.length || 0, icon: LogIn, color: "bg-blue-50 text-blue-700", iconColor: "text-blue-500" },
    { label: "Checked In", value: checkedIn?.length || 0, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700", iconColor: "text-emerald-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/staff/book" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium">
            <CalendarPlus className="w-4 h-4" /> Walk-in Booking
          </Link>
          <Link href="/staff/check-in" className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            <LogIn className="w-4 h-4" /> Check-in / Check-out
          </Link>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Room Availability</h2>
          <p className="text-sm text-gray-500">Current room status and active guest information</p>
        </div>
        <RoomOperationsTable initialRooms={operationalRooms} />
      </div>
    </div>
  )
}
