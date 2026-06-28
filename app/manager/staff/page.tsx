import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, ArrowLeft, CheckCircle, XCircle } from "lucide-react"

export default async function ManagerStaffPage() {
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

  const { data: staffMembers } = await supabase
    .from("user_roles")
    .select("*")
    .in("role", ["front_desk", "staff"])
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/manager/dashboard" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage front desk staff</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
        </div>
        {staffMembers && staffMembers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {staffMembers.map((staff: any) => (
              <div key={staff.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A3D62] rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {(staff.staff_name || staff.staff_email || "S").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{staff.staff_name || "Unnamed"}</p>
                    <p className="text-xs text-gray-500">{staff.staff_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full capitalize">{staff.role}</span>
                  {staff.is_active !== false ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No staff members found</p>
          </div>
        )}
      </div>
    </div>
  )
}
