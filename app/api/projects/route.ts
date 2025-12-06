import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, requireAuth } from '@/lib/supabase/server'

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') // 'in_progress' | 'complete' | null

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('writing_projects')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if provided
    if (status === 'complete') {
      query = query.eq('is_complete', true)
    } else if (status === 'in_progress') {
      query = query.eq('is_complete', false)
    }

    const { data: projects, error, count } = await query

    if (error) {
      console.error('Failed to fetch projects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Projects GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Create a new writing project
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const {
      title,
      topic,
      instructions,
      documentType,
      academicLevel,
      writingStyle,
      citationStyle,
      targetWordCount,
      aiProvider,
      metadata,
    } = body

    // Validate required fields
    if (!title || !topic || !documentType || !academicLevel || !writingStyle || !citationStyle) {
      return NextResponse.json(
        { error: 'Missing required fields: title, topic, documentType, academicLevel, writingStyle, citationStyle' },
        { status: 400 }
      )
    }

    // Create project record
    const { data: project, error } = await supabase
      .from('writing_projects')
      .insert({
        user_id: user.id,
        title,
        topic,
        instructions: instructions || null,
        document_type: documentType.toUpperCase().replace(/-/g, '_'),
        academic_level: academicLevel.toUpperCase(),
        writing_style: writingStyle.toUpperCase(),
        citation_style: citationStyle.toUpperCase(),
        target_word_count: targetWordCount || null,
        ai_provider: aiProvider || 'GROQ',
        metadata: metadata || {},
        workflow_step: 'research',
        is_complete: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create project:', error)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Projects POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
