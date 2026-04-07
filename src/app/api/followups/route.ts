import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const contactId = searchParams.get('contactId')
  const today = searchParams.get('today')
  
  const where: any = {}
  if (contactId) where.contactId = contactId
  if (today === 'true') {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    where.dueDate = {
      gte: startOfDay,
      lte: endOfDay,
    }
  }

  try {
    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        contact: true,
      },
      orderBy: { dueDate: 'asc' }
    })
    return NextResponse.json(followUps)
  } catch (error) {
    console.error('Error fetching follow-ups:', error)
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const followUp = await prisma.followUp.create({
      data: {
        contactId: body.contactId,
        dueDate: new Date(body.dueDate),
        type: body.type,
        status: body.status || 'pending',
        notes: body.notes,
      }
    })
    return NextResponse.json(followUp, { status: 201 })
  } catch (error) {
    console.error('Error creating follow-up:', error)
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 })
  }
}