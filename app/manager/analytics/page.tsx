import Link from 'next/link'
import { ArrowLeft, BarChart3, TrendingUp, Users, BedDouble } from 'lucide-react'

export default async function ManagerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/manager/dashboard" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">View resort performance and analytics</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500">Occupancy Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">72%</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500">Total Guests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">156</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500">Revenue (MTD)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">N12.4M</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Booking Trends</h2>
        <p className="text-gray-500 text-sm">Analytics charts and detailed reports will appear here.</p>
      </div>
    </div>
  )
}
