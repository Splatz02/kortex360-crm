import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const env = searchParams.get('environment')
  const pipelineStatus = searchParams.get('pipelineStatus')
  
  const where: any = {}
  if (env) where.environment = env
  if (pipelineStatus) where.pipelineStatus = pipelineStatus

  try {
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        followUps: true,
        payments: true,
        communications: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check permission for adding contacts
  const hasPermission = await checkPermission('actions.add_contacts')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied: add_contacts' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const contact = await prisma.contact.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        title: body.title,
        company: body.company,
        email: body.email,
        phone: body.phone || null,
        website: body.website,
        linkedinUrl: body.linkedinUrl,
        address: body.address,
        state: body.state,
        country: body.country,
        timezone: body.timezone,
        icpStatus: body.icpStatus || 'Cold',
        serviceQualifier: body.serviceQualifier,
        phoneType: body.phoneType || 'Unknown',
        contactStatus: body.contactStatus || 'New',
        interestStatus: body.interestStatus || 'Not Yet Asked',
        smsOptIn: body.smsOptIn || 'Pending',
        oneTimeDealValue: body.oneTimeDealValue || 0,
        monthlyDealValue: body.monthlyDealValue || 0,
        pipelineStatus: body.pipelineStatus || 'not_yet_called',
        assetLink: body.assetLink,
        assetNotes: body.assetNotes,
        callComments: body.callComments,
        followUpNote: body.followUpNote,
        leadNotes: body.leadNotes,
        outreachHistory: body.outreachHistory,
        demoLinks: body.demoLinks,
        environment: body.environment || 'cold_calling',
      }
    })
    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Check permission for deleting contacts
  const hasPermission = await checkPermission('actions.delete_contacts')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied: delete_contacts' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { ids } = body
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // Delete contacts - cascade will handle related records
    await prisma.contact.deleteMany({
      where: {
        id: { in: ids }
      }
    })
    
    return NextResponse.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error('Error bulk deleting contacts:', error)
    return NextResponse.json({ error: 'Failed to delete contacts' }, { status: 500 })
  }
}