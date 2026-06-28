import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BedDouble, ArrowLeft, CheckCircle, XCircle } from "lucide-react"

export default async function ManagerRoomsPage() {
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

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .order("room_number")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/manager/dashboard" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage hotel rooms</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">All Rooms</h2>
        </div>
        {rooms && rooms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Room</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price/Night</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Max Occupancy</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((room: any) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{room.room_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{room.room_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₦{room.price_per_night?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{room.max_occupancy}</td>
                    <td className="px-4 py-3">
                      {room.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <BedDouble className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No rooms found</p>
          </div>
        )}
      </div>
    </div>
  )
}
