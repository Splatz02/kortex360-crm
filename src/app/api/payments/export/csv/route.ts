export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper to expand recurring transactions into individual entries
function expandRecurringPayments(payments: any[]) {
  const expanded: any[] = []
  const now = new Date()
  
  for (const payment of payments) {
    if (!payment.startDate || !payment.recurringType || payment.recurringType === 'one_time') {
      // One-time payment - just add as is
      expanded.push({
        ...payment,
        displayDate: payment.date,
        isExpanded: false
      })
    } else {
      // Recurring payment - expand to individual entries
      const startDate = new Date(payment.startDate)
      const paymentDate = new Date(payment.date)
      
      let periods: { date: Date; amount: number }[] = []
      
      if (payment.recurringType === 'monthly') {
        // Generate monthly entries from startDate until now (or end of current period)
        let currentDate = new Date(startDate)
        while (currentDate <= now) {
          periods.push({
            date: new Date(currentDate),
            amount: payment.amount
          })
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      } else if (payment.recurringType === 'yearly') {
        // Generate yearly entries
        let currentDate = new Date(startDate)
        while (currentDate <= now) {
          periods.push({
            date: new Date(currentDate),
            amount: payment.amount
          })
          currentDate.setFullYear(currentDate.getFullYear() + 1)
        }
      }
      
      // Add all expanded entries
      for (const period of periods) {
        expanded.push({
          ...payment,
          date: period.date.toISOString(),
          displayDate: period.date,
          amount: period.amount,
          isExpanded: true,
          originalPaymentId: payment.paymentId
        })
      }
    }
  }
  
  // Sort by date descending
  return expanded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const exportType = searchParams.get('exportType') || 'both' // 'expenses', 'payments', 'both'
    
    const payments = await prisma.payment.findMany({
      include: {
        contact: true,
        files: true
      },
      orderBy: { date: 'desc' }
    })
    
    // Filter by type
    let filteredPayments = payments
    if (exportType === 'expenses') {
      filteredPayments = payments.filter(p => p.type === 'expense')
    } else if (exportType === 'payments') {
      filteredPayments = payments.filter(p => p.type === 'payment')
    }
    
    // Expand recurring payments
    const expandedPayments = expandRecurringPayments(filteredPayments)
    
    // Generate CSV content
    const headers = ['Payment ID', 'Title', 'Type', 'Amount', 'Category', 'Description', 'Date', 'Contact', 'Recurring', 'Original Payment ID']
    const csvRows = [headers.join(',')]
    
    for (const payment of expandedPayments) {
      const contactName = payment.contact 
        ? `${payment.contact.firstName} ${payment.contact.lastName}` 
        : ''
      
      const row = [
        `"${payment.paymentId || ''}"`,
        `"${(payment.title || '').replace(/"/g, '""')}"`,
        `"${payment.type || ''}"`,
        payment.amount.toString(),
        `"${payment.category || ''}"`,
        `"${(payment.description || '').replace(/"/g, '""')}"`,
        `"${new Date(payment.date).toLocaleDateString()}"`,
        `"${contactName.replace(/"/g, '""')}"`,
        `"${payment.recurringType || 'one_time'}"`,
        `"${payment.originalPaymentId || ''}"`
      ]
      csvRows.push(row.join(','))
    }
    
    const csvContent = csvRows.join('\n')
    
    // Return as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 })
  }
}