import { createClient } from '@/lib/supabase/client'
import { validateImageFile, generateImageFilename, getImageDimensions } from './imageOptimizer'

export interface UploadResult {
  success: boolean
  url?: string | undefined
  path?: string | undefined
  error?: string | undefined
  metadata?: { width: number; height: number; size: number; type: string } | undefined
}

/**
 * Upload a single image to Supabase Storage
 */
export async function uploadRoomImage(
  file: File,
  roomId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Validate
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    // Get dimensions
    const dimensions = await getImageDimensions(file)

    // Generate unique filename
    const filename = generateImageFilename(roomId, file.name)
    const filePath = `rooms/${filename}`

    // Upload to Supabase
    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('atican-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('atican-media')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        size: file.size,
        type: file.type,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteRoomImage(pathOrUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Extract path from URL if needed
    let filePath = pathOrUrl
    if (pathOrUrl.includes('/storage/v1/object/public/')) {
      const parts = pathOrUrl.split('/atican-media/')
      filePath = parts[1]?.split('?')[0] || pathOrUrl
    }

    const { error } = await supabase.storage
      .from('atican-media')
      .remove([filePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete failed' }
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(
  files: File[],
  roomId: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) continue
    const result = await uploadRoomImage(file, roomId, (p) => onProgress?.(i, p))
    results.push(result)
  }

  return results
}