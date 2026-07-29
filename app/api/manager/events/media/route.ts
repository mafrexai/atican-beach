import { NextRequest, NextResponse } from 'next/server'
import { authorizeManager } from '@/lib/manager/authorize'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])

export async function POST(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Select a media file to upload.' }, { status: 400 })
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, MP4 or WebM media.' }, { status: 400 })
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Media files must be 25 MB or smaller.' }, { status: 400 })

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `events/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const { error } = await auth.admin.storage.from('atican-media').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = auth.admin.storage.from('atican-media').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image' }, { status: 201 })
}
