import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  // Check permission for importing contacts
  const hasPermission = await checkPermission('actions.import_contacts')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied: import_contacts' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { contacts, environment } = body

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })
    }

    const createdContacts = []

    for (const contact of contacts) {
      // Name fallback logic: if no person's name, use company name
      let firstName = contact.firstName || contact.name || ''
      let lastName = contact.lastName || ''

      // If firstName is empty but we have a company name, use company as display name
      if (!firstName && contact.company) {
        firstName = contact.company
        lastName = ''
      }

      if (!firstName) {
        // Skip contacts without any name
        continue
      }

      const created = await prisma.contact.create({
        data: {
          firstName,
          lastName,
          title: contact.title || null,
          company: contact.company || null,
          email: contact.email || null,
          phone: contact.phone || null,
          website: contact.website || null,
          linkedinUrl: contact.linkedinUrl || null,
          address: contact.address || null,
          state: contact.state || null,
          country: contact.country || null,
          timezone: contact.timezone || null,
          icpStatus: contact.icpStatus || 'Cold',
          serviceQualifier: contact.serviceQualifier || null,
          phoneType: contact.phoneType || 'Unknown',
          contactStatus: contact.contactStatus || 'New',
          interestStatus: contact.interestStatus || 'Not Yet Asked',
          smsOptIn: contact.smsOptIn || 'Pending',
          oneTimeDealValue: contact.oneTimeDealValue || 0,
          monthlyDealValue: contact.monthlyDealValue || 0,
          pipelineStatus: contact.pipelineStatus || 'not_yet_called',
          assetLink: contact.assetLink || null,
          assetNotes: contact.assetNotes || null,
          callComments: contact.callComments || null,
          followUpNote: contact.followUpNote || null,
          leadNotes: contact.leadNotes || null,
          outreachHistory: contact.outreachHistory || null,
          demoLinks: contact.demoLinks || null,
          environment: environment || 'cold_calling',
        }
      })
      createdContacts.push(created)
    }

    return NextResponse.json({ 
      success: true, 
      createdCount: createdContacts.length 
    }, { status: 201 })
  } catch (error) {
    console.error('Error importing contacts:', error)
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 })
  }
}