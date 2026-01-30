import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, requireAuth } from '@/lib/supabase/server'

/**
 * GET /api/user/profile
 * Get the current user's profile and preferences
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile and preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const allowedFields = ['full_name', 'avatar_url', 'preferences']
    const updates: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Profile PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
