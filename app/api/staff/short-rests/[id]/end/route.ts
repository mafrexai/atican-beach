import { NextResponse } from 'next/server'
import { authorizeFrontDesk } from '@/lib/staff/authorize'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const { id } = await params

  const { data, error } = await auth.admin.rpc('end_short_rest_atomic', { p_short_rest_id: id, p_user_id: auth.userId })
  if (error) {
    if (error.message.includes('SHORT_REST_NOT_ACTIVE')) return NextResponse.json({ error: 'This short rest has already ended.' }, { status: 409 })
    if (error.message.includes('SHORT_REST_NOT_FOUND')) return NextResponse.json({ error: 'Short rest not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to end the short rest.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, result: data })
}
