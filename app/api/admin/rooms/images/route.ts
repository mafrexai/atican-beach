import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const roomId = formData.get('roomId') as string | null

    if (!file || !roomId) {
      return NextResponse.json({ error: 'Missing file or roomId' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `rooms/${roomId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('atican-media')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('atican-media').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    // Update database - this was the weak part
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('gallery_images, image_url')
      .eq('id', roomId)
      .single()

    let updateSuccess = false

    if (!fetchError && room) {
      const currentGallery = Array.isArray(room.gallery_images) ? room.gallery_images : []
      const galleryImages = [...currentGallery, publicUrl]

      const updates: any = { 
        gallery_images: galleryImages,
        updated_at: new Date().toISOString()
      }

      // Set as featured image if none exists
      if (!room.image_url) {
        updates.image_url = publicUrl
        updates.image_alt = `Room ${roomId} main image`
      }

      const { error: updateError } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', roomId)

      if (updateError) {
        console.error('Database update error:', updateError)
      } else {
        updateSuccess = true
      }
    }

    // Force revalidation
    revalidatePath(`/admin/rooms/${roomId}/media`)
    revalidatePath(`/rooms/${roomId}`)
    revalidatePath('/rooms')
    revalidatePath('/admin/rooms')

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      updateSuccess 
    })

  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}