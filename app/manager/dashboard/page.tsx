import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, BedDouble, Activity, BarChart3, Wrench, CalendarDays } from "lucide-react"

export default async function ManagerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/manager/login")
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (userRole?.role !== "manager") {
    redirect("/manager/login")
  }

  const [{ data: bookings }, { data: rooms }, { data: staff }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "front_desk"),
  ])

  const stats = [
    { label: "Total Bookings", value: bookings?.length || 0, icon: CalendarDays, color: "bg-blue-500" },
    { label: "Active Rooms", value: rooms?.length || 0, icon: BedDouble, color: "bg-green-500" },
    { label: "Staff Members", value: staff?.length || 0, icon: Users, color: "bg-purple-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Heres an overview of hotel operations.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/manager/rooms" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            <BedDouble className="w-6 h-6" /><span className="text-sm font-medium">View Rooms</span>
          </Link>
          <Link href="/manager/staff" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
            <Users className="w-6 h-6" /><span className="text-sm font-medium">Manage Staff</span>
          </Link>
          <Link href="/manager/activity" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">
            <Activity className="w-6 h-6" /><span className="text-sm font-medium">Activity Logs</span>
          </Link>
          <Link href="/manager/analytics" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors">
            <BarChart3 className="w-6 h-6" /><span className="text-sm font-medium">Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
