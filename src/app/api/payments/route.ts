import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const contactId = searchParams.get('contactId')
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  
  const where: any = {}
  if (contactId) where.contactId = contactId
  if (type) where.type = type
  
  // Search by title (partial match, case-insensitive)
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }
  
  // Date range filtering
  if (fromDate) {
    where.date = { ...where.date, gte: new Date(fromDate) }
  }
  if (toDate) {
    where.date = { ...where.date, lte: new Date(toDate) }
  }

  try {
    const payments = await prisma.payment.findMany({
      where,
      include: {
        contact: true,
        _count: {
          select: { files: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 50
    })
    // Transform to include fileCount
    const paymentsWithCount = payments.map(p => ({
      ...p,
      fileCount: p._count.files
    }))
    return NextResponse.json(paymentsWithCount)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // For recurring payments, set the date to use the day from startDate (not the start date itself)
    let paymentDate = new Date(body.date || new Date())
    const recurringType = body.recurringType || 'one_time'
    
    if ((recurringType === 'monthly' || recurringType === 'yearly') && body.startDate) {
      const startDate = new Date(body.startDate)
      // Set payment date to the same day of month as startDate
      paymentDate = new Date(paymentDate)
      paymentDate.setDate(startDate.getDate())
    }
    
    // Generate unique payment ID (PAY-001, PAY-002, etc.)
    const lastPayment = await prisma.payment.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    let nextNum = 1
    if (lastPayment?.paymentId) {
      const match = lastPayment.paymentId.match(/^PAY-(\d+)$/)
      if (match) {
        nextNum = parseInt(match[1], 10) + 1
      }
    }
    const paymentIdNum = String(nextNum).padStart(3, '0')
    const paymentId = `PAY-${paymentIdNum}`
    
    const payment = await prisma.payment.create({
      data: {
        paymentId,
        contactId: body.contactId || null,
        title: body.title,
        type: body.type,
        amount: body.amount,
        category: body.category,
        description: body.description,
        date: paymentDate,
        recurringType: recurringType,
        startDate: body.startDate ? new Date(body.startDate) : null,
      }
    })
    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}