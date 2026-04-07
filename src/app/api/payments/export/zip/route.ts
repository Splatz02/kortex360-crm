export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import { Readable } from 'stream'

// Helper to expand recurring transactions into individual entries
function expandRecurringPayments(payments: any[]) {
  const expanded: any[] = []
  const now = new Date()
  
  for (const payment of payments) {
    if (!payment.startDate || !payment.recurringType || payment.recurringType === 'one_time') {
      expanded.push({
        ...payment,
        displayDate: payment.date,
        isExpanded: false
      })
    } else {
      const startDate = new Date(payment.startDate)
      
      let periods: { date: Date; amount: number }[] = []
      
      if (payment.recurringType === 'monthly') {
        let currentDate = new Date(startDate)
        while (currentDate <= now) {
          periods.push({
            date: new Date(currentDate),
            amount: payment.amount
          })
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      } else if (payment.recurringType === 'yearly') {
        let currentDate = new Date(startDate)
        while (currentDate <= now) {
          periods.push({
            date: new Date(currentDate),
            amount: payment.amount
          })
          currentDate.setFullYear(currentDate.getFullYear() + 1)
        }
      }
      
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
  
  return expanded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export async function GET(request: NextRequest) {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        contact: true,
        files: true
      },
      orderBy: { date: 'desc' }
    })
    
    // Expand recurring payments
    const expandedPayments = expandRecurringPayments(payments)
    
    // Calculate totals for summary
    const allPayments = expandedPayments.filter(p => p.type === 'payment')
    const allExpenses = expandedPayments.filter(p => p.type === 'expense')
    const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalExpenses = allExpenses.reduce((sum, p) => sum + p.amount, 0)
    const netTotal = totalPayments - totalExpenses
    
    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // Collect chunks
    const chunks: Buffer[] = []
    return new Promise<NextResponse>((resolve, reject) => {
      archive.on('data', (chunk) => chunks.push(chunk))
      
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks)
        resolve(new NextResponse(zipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.zip"`
          }
        }))
      })
      
      archive.on('error', (err) => {
        console.error('Archive error:', err)
        reject(NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 }))
      })
      
      // Create summary.txt
      let summary = `==========================================
         PAYMENTS & EXPENSES EXPORT
==========================================
Generated: ${new Date().toLocaleString()}

-----------------------------------
SUMMARY
-----------------------------------
Total Payments:      ${formatCurrency(totalPayments)}
Total Expenses:      ${formatCurrency(totalExpenses)}
-----------------------------------
Net Total:           ${formatCurrency(netTotal)}
==========================================

Total Transactions: ${expandedPayments.length}
  - Payments: ${allPayments.length}
  - Expenses: ${allExpenses.length}
`
      
      archive.append(summary, { name: 'summary.txt' })
      
      // Create individual transaction folders
      for (const payment of expandedPayments) {
        const folderName = `transaction-${payment.paymentId || payment.id}`
        const contactName = payment.contact 
          ? `${payment.contact.firstName} ${payment.contact.lastName}` 
          : 'N/A'
        
        let infoText = `==========================================
TRANSACTION DETAILS
==========================================
Payment ID:     ${payment.paymentId || 'N/A'}
Title:          ${payment.title || 'N/A'}
Type:           ${payment.type}
Amount:         ${formatCurrency(payment.amount)}
Date:           ${formatDate(payment.date)}
Category:       ${payment.category || 'N/A'}
Description:    ${payment.description || 'N/A'}
Contact:        ${contactName}
Recurring:      ${payment.recurringType || 'one_time'}
`
        if (payment.isExpanded) {
          infoText += `Note:          Expanded from recurring\n`
          infoText += `Original ID:   ${payment.originalPaymentId}\n`
        }
        if (payment.startDate) {
          infoText += `Start Date:    ${formatDate(payment.startDate)}\n`
        }
        infoText += `==========================================`
        
        archive.append(infoText, { name: `${folderName}/info.txt` })
      }
      
      archive.finalize()
    })
  } catch (error) {
    console.error('Error exporting ZIP:', error)
    return NextResponse.json({ error: 'Failed to export ZIP' }, { status: 500 })
  }
}