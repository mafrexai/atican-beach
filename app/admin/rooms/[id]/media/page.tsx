'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Upload, X, Star, Trash2, GripVertical, Image as ImageIcon,
  Loader2, ArrowLeft, ZoomIn
} from 'lucide-react'

interface RoomImage {
  url: string
  path: string
}

export default function RoomMediaPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<any>(null)
  const [images, setImages] = useState<RoomImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch latest room data
  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}?t=${Date.now()}`, {
        cache: 'no-store',
        next: { revalidate: 0 }
      })

      if (res.ok) {
        const data = await res.json()
        setRoom(data.room)

        const allImages: RoomImage[] = []

        // Main featured image
        if (data.room?.image_url) {
          allImages.push({ url: data.room.image_url, path: data.room.image_url })
        }

        // Gallery images - this is critical
        if (data.room?.gallery_images && Array.isArray(data.room.gallery_images)) {
          data.room.gallery_images.forEach((url: string) => {
            if (url && !allImages.some(img => img.url === url)) {
              allImages.push({ url, path: url })
            }
          })
        }

        setImages(allImages)
      }
    } catch (err) {
      console.error('Failed to fetch room data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchRoom()
  }, [roomId])

  // Upload handler
  async function uploadFiles(files: File[]) {
    setIsUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      const formData = new FormData()

      formData.append('file', file)
      formData.append('roomId', roomId)

      try {
        const res = await fetch('/api/admin/rooms/images', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          console.error('Upload failed:', data.error)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }

      setUploadProgress(((i + 1) / files.length) * 100)
    }

    setIsUploading(false)
    setUploadProgress(0)

    // FORCE REFRESH - this is the key
    await fetchRoom()
    router.refresh()
    // After await fetchRoom() and router.refresh()
    // window.location.reload();   // Temporary hard refresh
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) await uploadFiles(files)
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) await uploadFiles(files)
  }

  // Delete image
  async function deleteImage(url: string) {
    try {
      await fetch(`/api/admin/rooms/images?url=${encodeURIComponent(url)}&roomId=${roomId}`, { method: 'DELETE' })
      await fetchRoom()
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  // Set as featured
  async function setFeatured(url: string) {
    try {
      await fetch('/api/admin/rooms/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, action: 'setFeatured', imageUrl: url }),
      })
      await fetchRoom()
    } catch (err) {
      console.error('Set featured failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/rooms')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Room Media — {room?.room_type} #{room?.room_number}
          </h1>
          <p className="text-gray-500">{images.length} images uploaded</p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input type="file" accept="image/*" multiple id="upload" className="hidden" onChange={handleFileSelect} />
        <label htmlFor="upload" className="cursor-pointer block">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-medium text-lg">Drop images here or click to upload</p>
          <p className="text-sm text-gray-500 mt-1">JPEG, PNG, WebP • Max 5MB each</p>
        </label>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => {
            const isFeatured = img.url === room?.image_url
            return (
              <div key={img.url} className="relative group rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all">
                <Image
                  src={img.url}
                  alt="Room"
                  width={400}
                  height={300}
                  className="w-full h-56 object-cover"
                />

                {isFeatured && (
                  <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Featured
                  </div>
                )}

                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  {!isFeatured && (
                    <button onClick={() => setFeatured(img.url)} className="p-2 bg-white rounded-lg shadow">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirm(img.url)} className="p-2 bg-white rounded-lg shadow text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {deleteConfirm === img.url && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-3">
                    <button onClick={() => deleteImage(img.url)} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-white rounded-lg">Cancel</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500 border border-dashed border-gray-200 rounded-xl">
          No images uploaded yet
        </div>
      )}
    </div>
  )
}