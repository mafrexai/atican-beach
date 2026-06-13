import { Waves, Users } from 'lucide-react'

const roomTypeColors = [
  'from-gray-400 to-gray-500',
  'from-blue-400 to-blue-600',
  'from-teal-400 to-teal-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-amber-400 to-amber-600',
]

export default function RoomsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative py-24 bg-gradient-to-r from-blue-900 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="h-12 w-80 bg-blue-800/50 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-64 bg-blue-800/30 rounded mx-auto animate-pulse" />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg">
              <div className={`h-48 bg-gradient-to-br ${roomTypeColors[i % roomTypeColors.length]} animate-pulse`} />
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-5 w-14 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}