import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#0A3D62]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-10 h-10 text-[#0A3D62]" />
        </div>
        <h1 className="text-2xl font-bold text-[#082032] mb-2">Page Not Found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A3D62] text-white rounded-lg hover:bg-[#08324f] transition-colors text-sm font-medium"
        >
          <Home className="w-4 h-4" />
          Return to Home
        </Link>
      </div>
    </div>
  )
}