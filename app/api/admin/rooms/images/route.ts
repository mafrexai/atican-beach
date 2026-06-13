import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST - Upload image
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const roomId = formData.get('roomId') as string | null

    if (!file || !roomId) {
      return NextResponse.json({ error: 'Missing file or roomId' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }, { status: 400 })
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max: 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filePath = `rooms/${roomId}/${timestamp}-${random}.${ext}`

    // Upload
    const { error: uploadError } = await supabase.storage
      .from('atican-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('atican-media')
      .getPublicUrl(filePath)

    // Update room record
    const { data: room } = await supabase
      .from('rooms')
      .select('gallery_images, image_url')
      .eq('id', roomId)
      .single()

    if (room) {
      const galleryImages = [...(room.gallery_images || []), urlData.publicUrl]
      const updates: Record<string, string | string[]> = {
        gallery_images: galleryImages,
      }
      // Set as main image if room doesn't have one
      if (!room.image_url) {
        updates.image_url = urlData.publicUrl
        updates.image_alt = `Room image`
      }
      await supabase.from('rooms').update(updates).eq('id', roomId)
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// DELETE - Delete image
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get('url')
    const roomId = searchParams.get('roomId')

    if (!imageUrl || !roomId) {
      return NextResponse.json({ error: 'Missing url or roomId' }, { status: 400 })
    }

    // Extract path from URL
    let filePath = imageUrl
    if (imageUrl.includes('/atican-media/')) {
      const parts = imageUrl.split('/atican-media/')
      filePath = parts[1]?.split('?')[0] || imageUrl
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('atican-media')
      .remove([filePath])

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Update room record - remove from gallery
    const { data: room } = await supabase
      .from('rooms')
      .select('gallery_images, image_url')
      .eq('id', roomId)
      .single()

    if (room) {
      const galleryImages = (room.gallery_images || []).filter((url: string) => url !== imageUrl)
      const updates: Record<string, string[] | null> = {
        gallery_images: galleryImages,
      }
      // If this was the main image, set to next gallery image or null
      if (room.image_url === imageUrl) {
        updates.image_url = galleryImages[0] || null
      }
      await supabase.from('rooms').update(updates).eq('id', roomId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}

// PATCH - Set featured/main image or reorder gallery
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { roomId, action, imageUrl, galleryImages } = body

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })
    }

    if (action === 'setFeatured' && imageUrl) {
      await supabase
        .from('rooms')
        .update({ image_url: imageUrl })
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}