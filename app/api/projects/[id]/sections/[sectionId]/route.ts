import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, requireAuth } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>
}

/**
 * PATCH /api/projects/[id]/sections/[sectionId]
 * Update a section's status and completion timestamp
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()
    const { id, sectionId } = await params

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('writing_projects')
      .select('id')
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

    // Verify section belongs to this project's current structure
    const { data: section, error: sectionCheckError } = await supabase
      .from('document_sections')
      .select('id, structure_id')
      .eq('id', sectionId)
      .single()

    if (sectionCheckError || !section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    // Verify structure belongs to project
    const { data: structure, error: structureCheckError } = await supabase
      .from('document_structures')
      .select('id')
      .eq('id', section.structure_id)
      .eq('project_id', id)
      .single()

    if (structureCheckError || !structure) {
      return NextResponse.json(
        { error: 'Section does not belong to this project' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, completed_at } = body

    // Validate status
    const validStatuses = ['pending', 'writing', 'review', 'complete']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, any> = {}
    if (status !== undefined) {
      updates.status = status
    }
    if (completed_at !== undefined) {
      updates.completed_at = completed_at
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update section
    const { data: updatedSection, error } = await supabase
      .from('document_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update section:', error)
      return NextResponse.json(
        { error: 'Failed to update section' },
        { status: 500 }
      )
    }

    return NextResponse.json({ section: updatedSection })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Section PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

