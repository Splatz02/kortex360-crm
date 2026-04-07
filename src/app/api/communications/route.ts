import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const contactId = searchParams.get('contactId')
  
  const where: any = {}
  if (contactId) where.contactId = contactId

  try {
    const communications = await prisma.communication.findMany({
      where,
      include: {
        contact: true,
      },
      orderBy: { timestamp: 'desc' }
    })
    return NextResponse.json(communications)
  } catch (error) {
    console.error('Error fetching communications:', error)
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const communication = await prisma.communication.create({
      data: {
        contactId: body.contactId,
        type: body.type,
        direction: body.direction,
        content: body.content,
        status: body.status || 'manual',
        timestamp: new Date(body.timestamp || new Date()),
      }
    })
    return NextResponse.json(communication, { status: 201 })
  } catch (error) {
    console.error('Error creating communication:', error)
    return NextResponse.json({ error: 'Failed to create communication' }, { status: 500 })
  }
}