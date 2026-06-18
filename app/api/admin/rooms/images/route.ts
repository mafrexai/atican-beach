import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST - Upload image
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const roomId = formData.get('roomId') as string | null

    console.log('[Room Image Upload] Starting upload:', { roomId, fileName: file?.name, fileSize: file?.size, fileType: file?.type })

    if (!file || !roomId) {
      console.log('[Room Image Upload] Missing file or roomId')
      return NextResponse.json({ error: 'Missing file or roomId' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('[Room Image Upload] Invalid file type:', file.type)
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }, { status: 400 })
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('[Room Image Upload] File too large:', file.size)
      return NextResponse.json({ error: 'File too large. Max: 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filePath = `rooms/${roomId}/${timestamp}-${random}.${ext}`

    console.log('[Room Image Upload] Uploading to path:', filePath)

    // Convert File to Buffer for reliable upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('[Room Image Upload] Buffer size:', buffer.length)

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('atican-media')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('[Room Image Upload] Storage upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    console.log('[Room Image Upload] Storage upload successful')

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('atican-media')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl
    console.log('[Room Image Upload] Public URL:', publicUrl)

    // Update room record
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('gallery_images, image_url')
      .eq('id', roomId)
      .single()

    if (fetchError) {
      console.error('[Room Image Upload] Error fetching room:', fetchError)
      // Don't fail the upload if DB fetch fails — return the URL anyway
      return NextResponse.json({
        success: true,
        url: publicUrl,
        path: filePath,
        warning: 'Image uploaded but database update failed. Please refresh.',
      })
    }

    if (room) {
      const galleryImages = [...(room.gallery_images || []), publicUrl]
      const updates: Record<string, unknown> = {
        gallery_images: galleryImages,
      }
      // Set as main image if room doesn't have one
      if (!room.image_url) {
        updates.image_url = publicUrl
        updates.image_alt = `Room ${roomId} image`
      }

      console.log('[Room Image Upload] Updating room record:', { updates: Object.keys(updates) })

      const { error: updateError } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', roomId)

      if (updateError) {
        console.error('[Room Image Upload] Error updating room:', updateError)
        return NextResponse.json({
          success: true,
          url: publicUrl,
          path: filePath,
          warning: 'Image uploaded but database update failed. Please refresh.',
        })
      }

      console.log('[Room Image Upload] Room record updated successfully')
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
    })
  } catch (err) {
    console.error('[Room Image Upload] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// DELETE - Delete image
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get('url')
    const roomId = searchParams.get('roomId')

    console.log('[Room Image Delete] Starting delete:', { imageUrl, roomId })

    if (!imageUrl || !roomId) {
      return NextResponse.json({ error: 'Missing url or roomId' }, { status: 400 })
    }

    // Extract path from URL
    let filePath = imageUrl
    if (imageUrl.includes('/atican-media/')) {
      const parts = imageUrl.split('/atican-media/')
      filePath = parts[1]?.split('?')[0] || imageUrl
    }

    console.log('[Room Image Delete] Deleting path:', filePath)

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('atican-media')
      .remove([filePath])

    if (deleteError) {
      console.error('[Room Image Delete] Storage delete error:', deleteError)
      return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 })
    }

    // Update room record - remove from gallery
    const { data: room } = await supabase
      .from('rooms')
      .select('gallery_images, image_url')
      .eq('id', roomId)
      .single()

    if (room) {
      const galleryImages = (room.gallery_images || []).filter((url: string) => url !== imageUrl)
      const updates: Record<string, unknown> = {
        gallery_images: galleryImages,
      }
      // If this was the main image, set to next gallery image or null
      if (room.image_url === imageUrl) {
        updates.image_url = galleryImages[0] || null
        updates.image_alt = null
      }
      await supabase.from('rooms').update(updates).eq('id', roomId)
    }

    console.log('[Room Image Delete] Delete successful')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Room Image Delete] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}

// PATCH - Set featured/main image or reorder gallery
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await req.json()
    const { roomId, action, imageUrl, galleryImages } = body

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
    }

    if (action === 'setFeatured' && imageUrl) {
      await supabase
        .from('rooms')
        .update({ image_url: imageUrl, image_alt: `Room ${roomId} image` })
        .eq('id', roomId)
    }

    if (action === 'reorder' && Array.isArray(galleryImages)) {
      await supabase
        .from('rooms')
        .update({ gallery_images: galleryImages })
        .eq('id', roomId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Room Image Update] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}