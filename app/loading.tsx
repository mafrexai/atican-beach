export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#0A3D62] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}