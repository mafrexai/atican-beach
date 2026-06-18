import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const roomId = formData.get('roomId') as string | null
    if (!file || !roomId) { return NextResponse.json({ error: 'Missing file or roomId' }, { status: 400 }) }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { return NextResponse.json({ error: 'Invalid file type' }, { status: 400 }) }
    if (file.size > 5 * 1024 * 1024) { return NextResponse.json({ error: 'File too large' }, { status: 400 }) }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = 'rooms/' + roomId + '/' + String(Date.now()) + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from('atican-media').upload(filePath, buffer, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (uploadError) { return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 }) }
    const { data: urlData } = supabase.storage.from('atican-media').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl
    const { data: room, error: fetchError } = await supabase.from('rooms').select('gallery_images, image_url').eq('id', roomId).single()
    if (fetchError) { return NextResponse.json({ success: true, url: publicUrl, path: filePath, warning: 'DB update failed' }) }
    if (room) {
      const galleryImages = [...(room.gallery_images || []), publicUrl]
      const updates: Record<string, unknown> = { gallery_images: galleryImages }
      if (!room.image_url) { updates.image_url = publicUrl; updates.image_alt = 'Room ' + roomId + ' image' }
      const { error: updateError } = await supabase.from('rooms').update(updates).eq('id', roomId)
      if (updateError) { return NextResponse.json({ success: true, url: publicUrl, path: filePath, warning: 'DB update failed' }) }
    }
    return NextResponse.json({ success: true, url: publicUrl, path: filePath })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get('url')
    const roomId = searchParams.get('roomId')
    if (!imageUrl || !roomId) { return NextResponse.json({ error: 'Missing url or roomId' }, { status: 400 }) }
    let filePath = imageUrl
    if (imageUrl.includes('/atican-media/')) { filePath = imageUrl.split('/atican-media/')[1]?.split('?')[0] || imageUrl }
    const { error: deleteError } = await supabase.storage.from('atican-media').remove([filePath])
    if (deleteError) { return NextResponse.json({ error: 'Delete failed: ' + deleteError.message }, { status: 500 }) }
    const { data: room } = await supabase.from('rooms').select('gallery_images, image_url').eq('id', roomId).single()
    if (room) {
      const galleryImages = (room.gallery_images || []).filter((url: string) => url !== imageUrl)
      const updates: Record<string, unknown> = { gallery_images: galleryImages }
      if (room.image_url === imageUrl) { updates.image_url = galleryImages[0] || null; updates.image_alt = null }
      await supabase.from('rooms').update(updates).eq('id', roomId)
    }
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete failed' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { roomId, action, imageUrl, galleryImages } = body
    if (!roomId) { return NextResponse.json({ error: 'Missing roomId' }, { status: 400 }) }
    if (action === 'setFeatured' && imageUrl) { await supabase.from('rooms').update({ image_url: imageUrl, image_alt: 'Room ' + roomId + ' image' }).eq('id', roomId) }
    if (action === 'reorder' && Array.isArray(galleryImages)) { await supabase.from('rooms').update({ gallery_images: galleryImages }).eq('id', roomId) }
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 500 }) }
}
