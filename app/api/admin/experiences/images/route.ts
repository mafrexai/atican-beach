import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST - Upload image
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const experienceId = formData.get('experienceId') as string | null

    console.log('[Experience Image Upload] Starting upload:', { experienceId, fileName: file?.name, fileSize: file?.size, fileType: file?.type })

    if (!file || !experienceId) {
      return NextResponse.json({ error: 'Missing file or experienceId' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max: 5MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filePath = `experiences/${experienceId}/${timestamp}-${random}.${ext}`

    console.log('[Experience Image Upload] Uploading to path:', filePath)

    // Convert File to Buffer for reliable upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('atican-media')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('[Experience Image Upload] Storage upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    console.log('[Experience Image Upload] Storage upload successful')

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('atican-media')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl
    console.log('[Experience Image Upload] Public URL:', publicUrl)

    // Update experience record - set as main image if none exists
    const { data: experience, error: fetchError } = await supabase
      .from('experiences')
      .select('image_url')
      .eq('id', experienceId)
      .single()

    if (fetchError) {
      console.error('[Experience Image Upload] Error fetching experience:', fetchError)
      return NextResponse.json({
        success: true,
        url: publicUrl,
        path: filePath,
        warning: 'Image uploaded but database update failed. Please refresh.',
      })
    }

    if (experience) {
      const updates: Record<string, unknown> = {}
      // Set as main image if none exists
      if (!experience.image_url) {
        updates.image_url = publicUrl
        updates.image_alt = `Experience ${experienceId} image`
      }

      console.log('[Experience Image Upload] Updating experience record:', { updates: Object.keys(updates) })

      const { error: updateError } = await supabase
        .from('experiences')
        .update(updates)
        .eq('id', experienceId)

      if (updateError) {
        console.error('[Experience Image Upload] Error updating experience:', updateError)
        return NextResponse.json({
          success: true,
          url: publicUrl,
          path: filePath,
          warning: 'Image uploaded but database update failed. Please refresh.',
        })
      }

      console.log('[Experience Image Upload] Experience record updated successfully')
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
    })
  } catch (err) {
    console.error('[Experience Image Upload] Unexpected error:', err)
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
    const experienceId = searchParams.get('experienceId')

    console.log('[Experience Image Delete] Starting delete:', { imageUrl, experienceId })

    if (!imageUrl || !experienceId) {
      return NextResponse.json({ error: 'Missing url or experienceId' }, { status: 400 })
    }

    let filePath = imageUrl
    if (imageUrl.includes('/atican-media/')) {
      const parts = imageUrl.split('/atican-media/')
      filePath = parts[1]?.split('?')[0] || imageUrl
    }

    console.log('[Experience Image Delete] Deleting path:', filePath)

    const { error: deleteError } = await supabase.storage
      .from('atican-media')
      .remove([filePath])

    if (deleteError) {
      console.error('[Experience Image Delete] Storage delete error:', deleteError)
      return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 })
    }

    // If this was the main image, clear it
    const { data: experience } = await supabase
      .from('experiences')
      .select('image_url')
      .eq('id', experienceId)
      .single()

    if (experience && experience.image_url === imageUrl) {
      await supabase
        .from('experiences')
        .update({ image_url: null, image_alt: null })
        .eq('id', experienceId)
    }

    console.log('[Experience Image Delete] Delete successful')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Experience Image Delete] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}

// PATCH - Set featured image
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    const body = await req.json()
    const { experienceId, action, imageUrl } = body

    if (!experienceId) {
      return NextResponse.json({ error: 'Missing experienceId' }, { status: 400 })
    }

    if (action === 'setFeatured' && imageUrl) {
      await supabase
        .from('experiences')
        .update({ image_url: imageUrl, image_alt: `Experience ${experienceId} image` })
        .eq('id', experienceId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Experience Image Update] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}