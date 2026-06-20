'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Upload, X, Star, Trash2, Image as ImageIcon,
  AlertTriangle, Loader2, ArrowLeft, ZoomIn
} from 'lucide-react'

interface TentImage {
  url: string
  path: string
}

export default function TentMediaPage() {
  const params = useParams()
  const router = useRouter()
  const tentId = params.id as string

  const [tent, setTent] = useState<{ tent_name: string; image_url: string | null } | null>(null)
  const [images, setImages] = useState<TentImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTent() {
      // const res = await fetch(`/api/admin/tents/${tentId}`)
      const timestamp = Date.now()
      const res = await fetch(`/api/admin/tents/${tentId}?t=${timestamp}`, { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()
        setTent(data.tent)
        if (data.tent.image_url) {
          setImages([{ url: data.tent.image_url, path: data.tent.image_url }])
        }
      }
      setLoading(false)
    }
    fetchTent()
  }, [tentId])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }

  // Re-fetch tent data from database
  async function refreshTentData() {
    try {
      const res = await fetch(`/api/admin/tents/${tentId}`)
      if (res.ok) {
        const data = await res.json()
        setTent(data.tent)
        if (data.tent.image_url) {
          setImages([{ url: data.tent.image_url, path: data.tent.image_url }])
        } else {
          setImages([])
        }
      }
    } catch (err) {
      console.error('Failed to refresh tent data:', err)
    }
  }

  async function uploadFiles(files: File[]) {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tentId', tentId)

      try {
        const res = await fetch('/api/admin/tents/images', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          console.error('Upload failed:', data.error)
          setUploadError(data.error || 'Upload failed')
        }
      } catch (err) {
        console.error('Upload failed:', err)
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }

      setUploadProgress(((i + 1) / files.length) * 100)
    }

    setIsUploading(false)
    setUploadProgress(0)

    // Always re-fetch from database after uploads complete
    await refreshTentData()
  }

  async function deleteImage(url: string) {
    try {
      await fetch(`/api/admin/tents/images?url=${encodeURIComponent(url)}&tentId=${tentId}`, {
        method: 'DELETE',
      })
      setImages((prev) => prev.filter((img) => img.url !== url))
      if (tent?.image_url === url) {
        setTent((prev) => prev ? { ...prev, image_url: null } : null)
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  async function setFeatured(url: string) {
    try {
      await fetch('/api/admin/tents/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tentId, action: 'setFeatured', imageUrl: url }),
      })
      setTent((prev) => prev ? { ...prev, image_url: url } : null)
    } catch (err) {
      console.error('Set featured failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/tents')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tent Media — {tent?.tent_name}
          </h1>
          <p className="text-gray-500 text-sm">{images.length} image{images.length !== 1 ? 's' : ''} uploaded</p>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Drop images here or click to upload'}
          </p>
          <p className="text-gray-400 text-sm mt-1">JPEG, PNG, WebP · Max 5MB each</p>
        </label>
        {isUploading && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => {
            const isFeatured = image.url === tent?.image_url
            return (
              <div
                key={image.url}
                className={`relative group rounded-xl overflow-hidden border-2 transition-colors ${
                  isFeatured ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="aspect-square bg-gray-100 cursor-pointer relative"
                  onClick={() => setLightboxImage(image.url)}
                >
                  <Image
                    src={image.url}
                    alt={`Tent image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                {isFeatured && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isFeatured && (
                    <button
                      onClick={() => setFeatured(image.url)}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-amber-50 transition-colors"
                      title="Set as featured"
                    >
                      <Star className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(image.url)}
                    className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                {deleteConfirm === image.url && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-4">
                    <p className="text-white text-sm text-center">Delete this image?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteImage(image.url)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-white text-gray-700 text-xs rounded-lg hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No images yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload images using the drop zone above</p>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightboxImage}
              alt="Full size"
              width={1200}
              height={800}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}