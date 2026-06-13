import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Tent, Image, AlertTriangle } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/images/imageOptimizer'

export default async function AdminTentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: tents } = await supabase.from('tents').select('*').order('price')
  const withoutImages = tents?.filter((t: any) => !t.image_url).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tents</h1>
          <p className="text-gray-500 mt-1">{tents?.length || 0} tents · {withoutImages} missing images</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tents?.map((tent: any) => (
          <div key={tent.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="h-32 bg-gray-100 relative">
              {tent.image_url ? (
                <img src={getThumbnailUrl(tent.image_url)} alt={tent.tent_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                  <Tent className="w-10 h-10 text-amber-300" />
                </div>
              )}
              {!tent.image_url && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900">{tent.tent_name}</h3>
              <p className="text-amber-600 font-bold text-sm mt-1">₦{tent.price.toLocaleString()}</p>
              <Link
                href={`/admin/tents/${tent.id}/media`}
                className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
              >
                <Image className="w-3.5 h-3.5" />
                Manage Images
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}