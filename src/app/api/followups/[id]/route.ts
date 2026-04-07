import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        type: body.type,
        status: body.status,
        notes: body.notes,
      }
    })
    return NextResponse.json(followUp)
  } catch (error) {
    console.error('Error updating follow-up:', error)
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.followUp.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting follow-up:', error)
    return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 })
  }
}