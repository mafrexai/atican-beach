'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, Check, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface UploadStatus {
  roomNumber: string
  fileName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function BatchUploadPage() {
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [csvData, setCsvData] = useState<{ roomNumber: string; imageUrl: string }[]>([])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )

    if (imageFiles.length === 0) return

    // Match files to rooms by filename (e.g., "702.jpg" → room 702)
    const newUploads: UploadStatus[] = imageFiles.filter((f): f is File => !!f).map((file) => {
      const roomNumber = (file.name.split('.')[0] || '').replace(/[^0-9]/g, '')
      return {
        roomNumber,
        fileName: file.name,
        status: 'pending' as const,
      }
    })

    setUploads(newUploads)
  }, [])

  async function processUploads() {
    setIsProcessing(true)

    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i]
      if (!upload || !upload.roomNumber) {
        setUploads((prev) => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'error', error: 'No room number in filename' } : u
        ))
        continue
      }

      setUploads((prev) => prev.map((u, idx) =>
        idx === i ? { ...u, status: 'uploading' } : u
      ))

      // Find room by number
      try {
        const roomRes = await fetch(`/api/admin/rooms?room_number=${upload.roomNumber}`)
        const roomData = await roomRes.json()

        if (!roomData.room) {
          setUploads((prev) => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'error', error: `Room ${upload.roomNumber} not found` } : u
          ))
          continue
        }

        // Get the actual file from the drop (we need to re-read from input)
        // For simplicity, we'll use a file input approach
        setUploads((prev) => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'error', error: 'Use individual upload for now' } : u
        ))
      } catch (err) {
        setUploads((prev) => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'error', error: 'Upload failed' } : u
        ))
      }
    }

    setIsProcessing(false)
  }

  const successCount = uploads.filter((u) => u.status === 'success').length
  const errorCount = uploads.filter((u) => u.status === 'error').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Batch Image Upload</h1>
        <p className="text-gray-500 mt-1">Upload multiple room images at once</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="font-semibold text-blue-900 mb-2">How to use</h2>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Name your image files with the room number (e.g., <code className="bg-blue-100 px-1 rounded">702.jpg</code>, <code className="bg-blue-100 px-1 rounded">201.png</code>)</li>
          <li>Drag and drop all images at once</li>
          <li>The system will match filenames to room numbers automatically</li>
          <li>Review and confirm the upload</li>
        </ol>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []).filter((f): f is File => !!f)
            const newUploads: UploadStatus[] = files.map((file) => ({
              roomNumber: (file.name.split('.')[0] || '').replace(/[^0-9]/g, ''),
              fileName: file.name,
              status: 'pending' as const,
            }))
            setUploads(newUploads)
          }}
          className="hidden"
          id="batch-upload"
        />
        <label htmlFor="batch-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-lg">Drop images here or click to select</p>
          <p className="text-gray-400 text-sm mt-2">Files should be named with room numbers (e.g., 702.jpg, 201.png)</p>
        </label>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{uploads.length} files ready</h2>
            <div className="flex gap-2">
              {successCount > 0 && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-4 h-4" /> {successCount} uploaded
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-4 h-4" /> {errorCount} failed
                </span>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-auto divide-y">
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{upload.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {upload.roomNumber ? `Room #${upload.roomNumber}` : 'No room number detected'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {upload.status === 'pending' && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Pending</span>
                  )}
                  {upload.status === 'uploading' && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading
                    </span>
                  )}
                  {upload.status === 'success' && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Done
                    </span>
                  )}
                  {upload.status === 'error' && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full" title={upload.error}>
                      Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}