export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    
    // Separate payments and expenses
    const allPayments = expandedPayments.filter(p => p.type === 'payment')
    const allExpenses = expandedPayments.filter(p => p.type === 'expense')
    
    // Calculate totals
    const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalExpenses = allExpenses.reduce((sum, p) => sum + p.amount, 0)
    const netTotal = totalPayments - totalExpenses
    
    // Format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(value)
    }
    
    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    
    // Generate text report
    let report = `==========================================
         PROFIT/LOSS STATEMENT
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

`
    
    // Payments section
    report += `-----------------------------------
PAYMENTS (${allPayments.length} entries)
-----------------------------------
`
    if (allPayments.length === 0) {
      report += "No payments recorded.\n"
    } else {
      for (const payment of allPayments) {
        const contactName = payment.contact 
          ? `${payment.contact.firstName} ${payment.contact.lastName}` 
          : 'N/A'
        report += `
ID:          ${payment.paymentId}
Title:       ${payment.title || 'N/A'}
Amount:      ${formatCurrency(payment.amount)}
Date:        ${formatDate(payment.date)}
Category:    ${payment.category || 'N/A'}
Description: ${payment.description || 'N/A'}
Contact:     ${contactName}
Recurring:   ${payment.recurringType || 'one_time'}
`
        if (payment.isExpanded) {
          report += `Note: Expanded from recurring (${payment.originalPaymentId})\n`
        }
        report += `---\n`
      }
    }
    
    report += `
-----------------------------------
EXPENSES (${allExpenses.length} entries)
-----------------------------------
`
    if (allExpenses.length === 0) {
      report += "No expenses recorded.\n"
    } else {
      for (const expense of allExpenses) {
        const contactName = expense.contact 
          ? `${expense.contact.firstName} ${expense.contact.lastName}` 
          : 'N/A'
        report += `
ID:          ${expense.paymentId}
Title:       ${expense.title || 'N/A'}
Amount:      ${formatCurrency(expense.amount)}
Date:        ${formatDate(expense.date)}
Category:    ${expense.category || 'N/A'}
Description: ${expense.description || 'N/A'}
Contact:     ${contactName}
Recurring:   ${expense.recurringType || 'one_time'}
`
        if (expense.isExpanded) {
          report += `Note: Expanded from recurring (${expense.originalPaymentId})\n`
        }
        report += `---\n`
      }
    }
    
    report += `
==========================================
END OF REPORT
==========================================
`
    
    // Return as downloadable text file
    return new NextResponse(report, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="profit-loss-${new Date().toISOString().split('T')[0]}.txt"`
      }
    })
  } catch (error) {
    console.error('Error exporting profit/loss:', error)
    return NextResponse.json({ error: 'Failed to export profit/loss' }, { status: 500 })
  }
}