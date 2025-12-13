import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, requireAuth } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/projects/[id]/content
 * Update the current document content for a project
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()
    const { id: projectId } = await params

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('writing_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { content, wordCount } = body

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Check if a current document exists
    const { data: existingDoc } = await supabase
      .from('generated_documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .single()

    if (existingDoc) {
      // Update existing document
      const { data: updatedDoc, error: updateError } = await supabase
        .from('generated_documents')
        .update({
          content,
          word_count: wordCount || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDoc.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update document:', updateError)
        return NextResponse.json(
          { error: 'Failed to update document' },
          { status: 500 }
        )
      }

      return NextResponse.json({ document: updatedDoc })
    } else {
      // Create new document
      const { data: newDoc, error: createError } = await supabase
        .from('generated_documents')
        .insert({
          project_id: projectId,
          content,
          word_count: wordCount || null,
          is_current: true,
          generation_completed: false,
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create document:', createError)
        return NextResponse.json(
          { error: 'Failed to create document' },
          { status: 500 }
        )
      }

      return NextResponse.json({ document: newDoc })
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Content update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
