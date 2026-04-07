import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PIPELINE_STAGES } from '@/types/crm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [contacts, followUps, payments] = await Promise.all([
    prisma.contact.findMany(),
    prisma.followUp.findMany({
      include: { contact: true },
      orderBy: { dueDate: 'asc' }
    }),
    prisma.payment.findMany({
      orderBy: { date: 'desc' },
      take: 10
    }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayFollowUps = followUps.filter(f => {
    const dueDate = new Date(f.dueDate)
    return dueDate >= today && dueDate < tomorrow
  })

  const overdueFollowUps = followUps.filter(f => {
    const dueDate = new Date(f.dueDate)
    return dueDate < today && f.status === 'pending'
  })

  const pipelineSummary = PIPELINE_STAGES.map(stage => {
    const stageContacts = contacts.filter(c => c.pipelineStatus === stage.value)
    const totalValue = stageContacts.reduce((sum, c) => sum + (c.oneTimeDealValue + c.monthlyDealValue || 0), 0)
    return {
      ...stage,
      count: stageContacts.length,
      totalValue
    }
  })

  const contactStatusCounts = {
    new: contacts.filter(c => c.contactStatus === 'New').length,
    contacted: contacts.filter(c => c.contactStatus === 'Contacted').length,
    qualified: contacts.filter(c => c.contactStatus === 'Qualified').length,
    converted: contacts.filter(c => c.contactStatus === 'Converted').length,
    lost: contacts.filter(c => c.contactStatus === 'Lost').length,
  }

  const totalPayments = payments
    .filter(p => p.type === 'payment')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalExpenses = payments
    .filter(p => p.type === 'expense')
    .reduce((sum, p) => sum + p.amount, 0)

  return NextResponse.json({
    contacts,
    followUps,
    todayFollowUps,
    overdueFollowUps,
    pipelineSummary,
    contactStatusCounts,
    payments,
    totalPayments,
    totalExpenses,
  })
}