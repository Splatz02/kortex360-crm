import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { dueDate: 'asc' }
        },
        payments: {
          orderBy: { date: 'desc' }
        },
        communications: {
          orderBy: { timestamp: 'desc' }
        },
      }
    })
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check permission for editing contacts
  const hasPermission = await checkPermission('actions.edit_contacts')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied: edit_contacts' }, { status: 403 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    
    // Fetch current contact data BEFORE updating to check for payment creation
    const currentContact = await prisma.contact.findUnique({
      where: { id }
    })
    
    if (!currentContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    // Build update data - only include fields that are provided in the request
    // This prevents accidentally overwriting existing values with undefined
    const updateData: Record<string, any> = {}
    
    const fieldMappings = [
      'firstName', 'lastName', 'title', 'company', 'email', 'phone',
      'website', 'linkedinUrl', 'address', 'state', 'country', 'timezone',
      'icpStatus', 'serviceQualifier', 'phoneType', 'contactStatus',
      'interestStatus', 'smsOptIn', 'oneTimeDealValue', 'monthlyDealValue',
      'pipelineStatus', 'assetLink', 'assetNotes', 'demoLinks', 'callComments',
      'followUpNote', 'leadNotes', 'outreachHistory', 'environment'
    ]
    
    for (const field of fieldMappings) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
    // Check the OLD pipeline status before update
    const oldPipelineStatus = currentContact.pipelineStatus
    const newPipelineStatus = updateData.pipelineStatus || oldPipelineStatus
    const wasClosedCollected = oldPipelineStatus === 'closed_collected'
    const isNowClosedCollected = newPipelineStatus === 'closed_collected'
    
    // Check if transitioning TO closed_collected (not already was)
    const shouldCreatePayments = isNowClosedCollected && !wasClosedCollected
    
    // Get deal values BEFORE update (they might be in updateData or currentContact)
    const oneTimeDealValue = updateData.oneTimeDealValue ?? currentContact.oneTimeDealValue
    const monthlyDealValue = updateData.monthlyDealValue ?? currentContact.monthlyDealValue
    
    // Also need to fetch from currentContact if updating pipelineStatus only
    // Use the values from currentContact for payment creation
    const paymentOneTimeValue = currentContact.oneTimeDealValue || 0
    const paymentMonthlyValue = currentContact.monthlyDealValue || 0
    
    // Update contact with only provided fields
    const contact = await prisma.contact.update({
      where: { id },
      data: updateData
    })
    
    // Auto-create payments when transitioning to closed_collected
    if (shouldCreatePayments) {
      const today = new Date()
      
      // Get company name or fall back to full name
      const companyName = currentContact.company || ''
      const fullName = `${currentContact.firstName} ${currentContact.lastName}`.trim()
      const displayName = companyName || fullName || 'Client'
      
      console.log(`[Payment Creation] Contact ${id} (${displayName}) transitioning to closed_collected`)
      console.log(`[Payment Creation] One-time deal value: ${paymentOneTimeValue}, Monthly deal value: ${paymentMonthlyValue}`)
      
      // Generate unique payment IDs
      const lastPayment = await prisma.payment.findFirst({
        orderBy: { paymentId: 'desc' }
      })
      let nextNum = 1
      if (lastPayment?.paymentId) {
        const match = lastPayment.paymentId.match(/^PAY-(\d+)$/)
        if (match) {
          nextNum = parseInt(match[1], 10) + 1
        }
      }
      
      // Create payment for one-time deal if value > 0
      if (paymentOneTimeValue > 0) {
        try {
          const paymentIdNum = String(nextNum).padStart(3, '0')
          await prisma.payment.create({
            data: {
              paymentId: `PAY-${paymentIdNum}`,
              contactId: id,
              title: `${displayName} - One Time Fee`,
              type: 'payment',
              amount: paymentOneTimeValue,
              category: 'Services',
              recurringType: 'one_time',
              date: today,
            }
          })
          nextNum++
          console.log(`[Payment Creation] Created one-time payment: ${paymentOneTimeValue}`)
        } catch (err) {
          console.error('[Payment Creation] Error creating one-time payment:', err)
        }
      }
      
      // Create payment for monthly deal if value > 0
      if (paymentMonthlyValue > 0) {
        try {
          const paymentIdNum = String(nextNum).padStart(3, '0')
          await prisma.payment.create({
            data: {
              paymentId: `PAY-${paymentIdNum}`,
              contactId: id,
              title: `${displayName} - Monthly Fee`,
              type: 'payment',
              amount: paymentMonthlyValue,
              category: 'Services',
              recurringType: 'monthly',
              date: today,
            }
          })
          console.log(`[Payment Creation] Created monthly payment: ${paymentMonthlyValue}`)
        } catch (err) {
          console.error('[Payment Creation] Error creating monthly payment:', err)
        }
      }
    }
    
    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check permission for deleting contacts
  const hasPermission = await checkPermission('actions.delete_contacts')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied: delete_contacts' }, { status: 403 })
  }

  const { id } = await params
  try {
    await prisma.contact.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}