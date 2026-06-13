import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, Image, AlertTriangle } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/images/imageOptimizer'

export default async function AdminExperiencesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: experiences } = await supabase.from('experiences').select('*').order('price')
  const withoutImages = experiences?.filter((e) => !e.image_url).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Experiences</h1>
          <p className="text-gray-500 mt-1">{experiences?.length || 0} experiences · {withoutImages} missing images</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {experiences?.map((exp) => (
          <div key={exp.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="h-32 bg-gray-100 relative">
              {exp.image_url ? (
                <img src={getThumbnailUrl(exp.image_url)} alt={exp.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
                  <Sparkles className="w-10 h-10 text-purple-300" />
                </div>
              )}
              {!exp.image_url && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900">{exp.name}</h3>
              <p className="text-purple-600 font-bold text-sm mt-1">₦{exp.price.toLocaleString()}</p>
              <Link
                href={`/admin/experiences/${exp.id}/media`}
                className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
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