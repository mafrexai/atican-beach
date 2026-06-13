const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Get an optimized image URL using Supabase Image Transformation API
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; quality?: number; format?: 'webp' | 'png' | 'jpeg' } = {}
): string {
  if (!url) return getPlaceholderUrl(options.width, options.height)

  // If it's already a Supabase storage URL, use transformations
  if (url.includes('/storage/v1/object/public/')) {
    const { width, height, quality = 80, format = 'webp' } = options
    const params = new URLSearchParams()
    if (width) params.set('width', String(width))
    if (height) params.set('height', String(height))
    params.set('quality', String(quality))
    params.set('format', format)
    return `${url}?${params.toString()}`
  }

  return url
}

/**
 * Get a thumbnail URL (150x150)
 */
export function getThumbnailUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { width: 150, height: 150, quality: 70 })
}

/**
 * Get a medium preview URL (400x300)
 */
export function getMediumUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { width: 400, height: 300, quality: 75 })
}

/**
 * Get a large/hero URL (1200x800)
 */
export function getHeroUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { width: 1200, height: 800, quality: 85 })
}

/**
 * Get WebP version of an image
 */
export function getWebPUrl(url: string | null | undefined): string {
  return getOptimizedImageUrl(url, { format: 'webp', quality: 80 })
}

/**
 * Get a placeholder SVG for missing images
 */
export function getPlaceholderUrl(width = 400, height = 300): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect fill="#e5e7eb" width="${width}" height="${height}"/>
      <text fill="#9ca3af" font-family="Arial,sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text>
    </svg>`
  )}`
}

/**
 * Extract image dimensions from a File object
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` }
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` }
  }

  return { valid: true }
}

/**
 * Generate a unique filename for upload
 */
export function generateImageFilename(roomId: string, originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${roomId}/${timestamp}-${random}.${ext}`
}