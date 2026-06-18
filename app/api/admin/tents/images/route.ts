import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const tentId = formData.get('tentId') as string | null
    if (!file || !tentId) { return NextResponse.json({ error: 'Missing file or tentId' }, { status: 400 }) }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { return NextResponse.json({ error: 'Invalid file type' }, { status: 400 }) }
    if (file.size > 5 * 1024 * 1024) { return NextResponse.json({ error: 'File too large' }, { status: 400 }) }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = 'tents/' + tentId + '/' + String(Date.now()) + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from('atican-media').upload(filePath, buffer, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (uploadError) { return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 }) }
    const { data: urlData } = supabase.storage.from('atican-media').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl
    const { data: tent, error: fetchError } = await supabase.from('tents').select('image_url').eq('id', tentId).single()
    if (fetchError) { return NextResponse.json({ success: true, url: publicUrl, path: filePath, warning: 'DB update failed' }) }
    if (tent) {
      const updates: Record<string, unknown> = {}
      if (!tent.image_url) { updates.image_url = publicUrl; updates.image_alt = 'Tent ' + tentId + ' image' }
      const { error: updateError } = await supabase.from('tents').update(updates).eq('id', tentId)
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
    const tentId = searchParams.get('tentId')
    if (!imageUrl || !tentId) { return NextResponse.json({ error: 'Missing url or tentId' }, { status: 400 }) }
    let filePath = imageUrl
    if (imageUrl.includes('/atican-media/')) { filePath = imageUrl.split('/atican-media/')[1]?.split('?')[0] || imageUrl }
    const { error: deleteError } = await supabase.storage.from('atican-media').remove([filePath])
    if (deleteError) { return NextResponse.json({ error: 'Delete failed: ' + deleteError.message }, { status: 500 }) }
    const { data: tent } = await supabase.from('tents').select('image_url').eq('id', tentId).single()
    if (tent && tent.image_url === imageUrl) { await supabase.from('tents').update({ image_url: null, image_alt: null }).eq('id', tentId) }
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete failed' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { tentId, action, imageUrl } = body
    if (!tentId) { return NextResponse.json({ error: 'Missing tentId' }, { status: 400 }) }
    if (action === 'setFeatured' && imageUrl) { await supabase.from('tents').update({ image_url: imageUrl, image_alt: 'Tent ' + tentId + ' image' }).eq('id', tentId) }
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 500 }) }
}
