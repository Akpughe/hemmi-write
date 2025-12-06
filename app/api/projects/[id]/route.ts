import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, requireAuth } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]
 * Get a single project with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    // Fetch project with all related data
    const { data: project, error: projectError } = await supabase
      .from('writing_projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch research sources
    const { data: sources } = await supabase
      .from('research_sources')
      .select('*')
      .eq('project_id', id)
      .order('position', { ascending: true })

    // Fetch current structure with sections
    const { data: structure } = await supabase
      .from('document_structures')
      .select(`
        *,
        sections:document_sections(*)
      `)
      .eq('project_id', id)
      .eq('is_current', true)
      .single()

    // Fetch current generated document
    const { data: document } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', id)
      .eq('is_current', true)
      .single()

    // Fetch chat messages (most recent 50)
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })
      .limit(50)

    return NextResponse.json({
      project,
      sources: sources || [],
      structure: structure || null,
      document: document || null,
      messages: messages || [],
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Project GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/[id]
 * Update a project's fields
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    // Verify project belongs to user
    const { data: existing, error: checkError } = await supabase
      .from('writing_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const allowedFields = [
      'title',
      'topic',
      'instructions',
      'document_type',
      'academic_level',
      'writing_style',
      'citation_style',
      'target_word_count',
      'ai_provider',
      'workflow_step',
      'is_complete',
      'metadata',
    ]

    // Filter to only allowed fields
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      // Handle camelCase to snake_case mapping
      const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      if (body[field] !== undefined) {
        updates[field] = body[field]
      } else if (body[camelField] !== undefined) {
        updates[field] = body[camelField]
      }
    }

    // Auto-set completed_at if marking as complete
    if (updates.is_complete === true) {
      updates.completed_at = new Date().toISOString()
    }

    // Update project
    const { data: project, error } = await supabase
      .from('writing_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update project:', error)
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Project PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]
 * Soft delete a project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    // Verify project belongs to user
    const { data: existing, error: checkError } = await supabase
      .from('writing_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('writing_projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete project:', error)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Project DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
