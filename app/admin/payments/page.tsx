import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'

export default async function AdminPaymentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()
  const { data: bookings } = await admin
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const paidBookings = (bookings || []).filter((b: any) => b.payment_status === 'paid')
  const pendingBookings = (bookings || []).filter((b: any) => b.payment_status !== 'paid')
  const totalRevenue = paidBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 text-sm mt-1">Track payment transactions and revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₦{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Paid Bookings</p>
          <p className="text-2xl font-bold text-[#0A3D62] mt-1">{paidBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Pending Payments</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingBookings.length}</p>
        </div>
      </div>

      {/* Pending Payments */}
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Payments</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-yellow-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Guest</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-sm font-semibold text-[#0A3D62]">
                        {booking.booking_reference}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">{booking.guest_name}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                        ₦{booking.total_amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          {booking.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Guest</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Payment Ref</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paidBookings.length > 0 ? (
                  paidBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-sm font-semibold text-[#0A3D62]">
                        {booking.booking_reference}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                        <p className="text-xs text-gray-500">{booking.guest_email}</p>
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                        ₦{booking.total_amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 font-mono">
                        {booking.payment_reference || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {booking.created_at
                          ? format(parseISO(booking.created_at), 'MMM d, yyyy')
                          : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No payment records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}