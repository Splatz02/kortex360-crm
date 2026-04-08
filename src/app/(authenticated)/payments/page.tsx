'use client'

import { useState, useEffect } from 'react'

interface Payment {
  id: string
  paymentId: string
  title?: string
  type: string
  amount: number
  category?: string
  description?: string
  date: string
  contactId?: string
  recurringType?: string
  startDate?: string
  fileCount: number
  contact?: {
    firstName: string
    lastName: string
  }
}

interface PaymentFile {
  id: string
  paymentId: string
  filename: string
  fileType: string
  filePath: string
  createdAt: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [contacts, setContacts] = useState<{id: string; firstName: string; lastName: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [recurringType, setRecurringType] = useState('one_time')
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editRecurringType, setEditRecurringType] = useState('one_time')
  const [filesModalPayment, setFilesModalPayment] = useState<Payment | null>(null)
  const [paymentFiles, setPaymentFiles] = useState<PaymentFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  async function downloadFile(url: string, filename: string) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    }
  }

  function exportCSV(type: string) {
    downloadFile(`/api/payments/export/csv?exportType=${type}`, `payments-${type}-${new Date().toISOString().split('T')[0]}.csv`)
    setShowExportMenu(false)
  }

  function exportProfitLoss() {
    downloadFile('/api/payments/export/profit-loss', `profit-loss-${new Date().toISOString().split('T')[0]}.txt`)
  }

  function exportZIP() {
    downloadFile('/api/payments/export/zip', `payments-backup-${new Date().toISOString().split('T')[0]}.zip`)
  }

  useEffect(() => {
    fetchData()
  }, [filterType, searchQuery, fromDate, toDate])

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showExportMenu])

  async function fetchData() {
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (searchQuery) params.set('search', searchQuery)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      
      const [paymentsRes, contactsRes] = await Promise.all([
        fetch(`/api/payments?${params}`),
        fetch('/api/contacts')
      ])
      
      setPayments(await paymentsRes.json())
      setContacts(await contactsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setSearchQuery('')
    setFromDate('')
    setToDate('')
    setFilterType('')
  }

  const hasActiveFilters = searchQuery || fromDate || toDate || filterType

  async function createPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: formData.get('contactId') || null,
          title: formData.get('title'),
          type: formData.get('type'),
          amount: parseFloat(formData.get('amount') as string),
          category: formData.get('category'),
          description: formData.get('description'),
          date: formData.get('date'),
          recurringType: formData.get('recurringType'),
          startDate: formData.get('startDate') || null,
        }),
      })
      fetchData()
      setShowModal(false)
    } catch (error) {
      console.error('Error creating payment:', error)
    }
  }

  async function deletePayment(id: string) {
    if (!confirm('Delete this transaction?')) return
    try {
      await fetch(`/api/payments/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  async function openFilesModal(payment: Payment) {
    setFilesModalPayment(payment)
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/payments/${payment.id}/files`)
      setPaymentFiles(await res.json())
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setFilesLoading(false)
    }
  }

  async function uploadFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const file = formData.get('file') as File
    if (!file || file.size === 0) return
    
    setUploadProgress(true)
    try {
      const res = await fetch(`/api/payments/${filesModalPayment?.id}/files`, {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const newFile = await res.json()
        setPaymentFiles(prev => [newFile, ...prev])
        form.reset()
        fetchData()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploadProgress(false)
    }
  }

  async function deleteFile(fileId: string) {
    if (!confirm('Delete this file?')) return
    try {
      await fetch(`/api/payments/${filesModalPayment?.id}/files/${fileId}`, { method: 'DELETE' })
      setPaymentFiles(prev => prev.filter(f => f.id !== fileId))
      fetchData()
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  async function updatePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingPayment) return
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await fetch(`/api/payments/${editingPayment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: formData.get('contactId') || null,
          title: formData.get('title'),
          type: formData.get('type'),
          amount: parseFloat(formData.get('amount') as string),
          category: formData.get('category'),
          description: formData.get('description'),
          date: formData.get('date'),
          recurringType: formData.get('recurringType'),
          startDate: formData.get('startDate') || null,
        }),
      })
      fetchData()
      setEditingPayment(null)
      setEditRecurringType('one_time')
    } catch (error) {
      console.error('Error updating payment:', error)
    }
  }

  function openEditModal(payment: Payment) {
    setEditingPayment(payment)
    setEditRecurringType(payment.recurringType || 'one_time')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const calculateTotalToDate = (payment: Payment): number => {
    if (!payment.startDate || !payment.recurringType || payment.recurringType === 'one_time') {
      return payment.amount
    }
    
    const now = new Date()
    const start = new Date(payment.startDate)
    const startDay = start.getDate()
    const currentDay = now.getDate()
    
    // Check if we've passed the start day of month
    const hasPassedStartDay = currentDay >= startDay
    
    if (payment.recurringType === 'monthly') {
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      // Only add current period if we've passed the start day
      const periods = hasPassedStartDay ? months + 1 : months
      return payment.amount * periods
    } else if (payment.recurringType === 'yearly') {
      const years = now.getFullYear() - start.getFullYear()
      // For yearly, check if we've passed the month AND day
      const hasPassedStartMonth = (now.getFullYear() > start.getFullYear()) ||
        (now.getFullYear() === start.getFullYear() && now.getMonth() > start.getMonth()) ||
        (now.getFullYear() === start.getFullYear() && now.getMonth() === start.getMonth() && currentDay >= startDay)
      const periods = hasPassedStartDay && hasPassedStartMonth ? years + 1 : years
      return payment.amount * periods
    }
    
    return payment.amount
  }

  const totalPayments = payments
    .filter(p => p.type === 'payment')
    .reduce((sum, p) => sum + calculateTotalToDate(p), 0)

  const totalExpenses = payments
    .filter(p => p.type === 'expense')
    .reduce((sum, p) => sum + calculateTotalToDate(p), 0)

  const netTotal = totalPayments - totalExpenses

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>Payments & Expenses</h1>
          <p style={{ color: '#9ca3af' }}>Track your transactions</p>
        </div>
        <div className="flex gap-3">
          {/* Export Button with Dropdown */}
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.15)', 
                color: '#22c55e',
                border: '1px solid #22c55e'
              }}
            >
              Export ↓
            </button>
            {showExportMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-50"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              >
                <div className="p-2">
                  <div className="text-xs font-medium px-3 py-2" style={{ color: '#9ca3af' }}>CSV Export</div>
                  <button
                    onClick={() => exportCSV('expenses')}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-green-900/30"
                    style={{ color: '#f5f5f5' }}
                  >
                    📊 Expenses Only
                  </button>
                  <button
                    onClick={() => exportCSV('payments')}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-green-900/30"
                    style={{ color: '#f5f5f5' }}
                  >
                    💰 Payments Only
                  </button>
                  <button
                    onClick={() => exportCSV('both')}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-green-900/30"
                    style={{ color: '#f5f5f5' }}
                  >
                    📊 Both
                  </button>
                </div>
                <div className="border-t" style={{ borderColor: '#2a2a2a' }}></div>
                <div className="p-2">
                  <button
                    onClick={() => { exportProfitLoss(); setShowExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-green-900/30"
                    style={{ color: '#f5f5f5' }}
                  >
                    📄 Profit/Loss Report
                  </button>
                  <button
                    onClick={() => { exportZIP(); setShowExportMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-green-900/30"
                    style={{ color: '#f5f5f5' }}
                  >
                    📦 Export ZIP
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg transition-all"
          style={{ 
            backgroundColor: 'rgba(0, 240, 255, 0.15)', 
            color: '#00f0ff',
            border: '1px solid #00f0ff',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
          }}
        >
          + Add Transaction
        </button>
        </div>
      </div>

      {/* Summary Cards - Neon Theme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border p-6" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <div className="text-sm" style={{ color: '#9ca3af' }}>Total Payments</div>
          <div className="text-2xl font-bold neon-green">{formatCurrency(totalPayments)}</div>
        </div>
        <div className="rounded-lg border p-6" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <div className="text-sm" style={{ color: '#9ca3af' }}>Total Expenses</div>
          <div className="text-2xl font-bold" style={{ color: '#ef4444', textShadow: '0 0 3px #ef4444' }}>{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="rounded-lg border p-6" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <div className="text-sm" style={{ color: '#9ca3af' }}>Net Total</div>
          <div className={`text-2xl font-bold ${netTotal >= 0 ? 'neon-green' : ''}`} style={{ color: netTotal >= 0 ? '#39ff14' : '#ef4444', textShadow: `0 0 3px ${netTotal >= 0 ? '#39ff14' : '#ef4444'}` }}>
            {formatCurrency(netTotal)}
          </div>
        </div>
      </div>

      {/* Filter - Neon Card */}
      <div className="rounded-lg border mb-4 p-4" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 rounded-lg transition-all flex-1 min-w-[150px]"
            style={{ 
              backgroundColor: '#222222', 
              border: '1px solid #2a2a2a',
              color: '#f5f5f5'
            }}
          />
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: '#222222', 
              border: '1px solid #2a2a2a',
              color: '#f5f5f5'
            }}
          >
            <option value="">All Types</option>
            <option value="payment">Payments Only</option>
            <option value="expense">Expenses Only</option>
          </select>
          {/* From Date */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: '#222222', 
              border: '1px solid #2a2a2a',
              color: '#f5f5f5'
            }}
          />
          <span style={{ color: '#9ca3af' }}>to</span>
          {/* To Date */}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: '#222222', 
              border: '1px solid #2a2a2a',
              color: '#f5f5f5'
            }}
          />
          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-lg transition-all text-sm"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444' }}
            >
              Clear Filters
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
            Showing {payments.length} result{payments.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Transactions Table - Neon Card */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: '#9ca3af' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#9ca3af' }}>No transactions yet</div>
        ) : (
          <div className="w-full overflow-x-auto relative">
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#1a1a1a] to-transparent pointer-events-none z-10 md:hidden" />
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#1a1a1a] to-transparent pointer-events-none z-10 md:hidden" />
            <table className="min-w-[1400px] w-full divide-y" style={{ borderColor: '#2a2a2a' }}>
            <thead style={{ backgroundColor: '#222222' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Payment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: '#9ca3af' }}>Contact</th>
                <th className="px-6 py-3 text-right text-xs font-medium" style={{ color: '#9ca3af' }}>Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium" style={{ color: '#9ca3af' }}>Total to Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#2a2a2a' }}>
              {payments.map(payment => (
                <tr key={payment.id} className="transition-colors" style={{ backgroundColor: '#1a1a1a' }}>
                  <td className="px-6 py-4 text-sm" style={{ color: '#9ca3af' }}>
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#00f0ff' }}>
                    {payment.paymentId}
                  </td>
                  <td className="px-6 py-4">
                    <a href={`/payments/${payment.id}`} style={{ color: '#f5f5f5' }} className="hover:underline">
                      {payment.title || '-'}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      payment.type === 'payment' 
                        ? 'border' 
                        : 'border'
                    }`} style={{ 
                      backgroundColor: payment.type === 'payment' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                      color: payment.type === 'payment' ? '#22c55e' : '#ef4444',
                      borderColor: payment.type === 'payment' ? '#22c55e' : '#ef4444'
                    }}>
                      {payment.type}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: '#f5f5f5' }}>
                    {payment.description || '-'}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#9ca3af' }}>
                    {payment.category || '-'}
                  </td>
                  <td className="px-6 py-4" style={{ color: '#9ca3af' }}>
                    {payment.contact 
                      ? `${payment.contact.firstName} ${payment.contact.lastName}` 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span style={{ color: payment.type === 'payment' ? '#22c55e' : '#ef4444' }}>
                      {payment.type === 'payment' ? '+' : '-'}{formatCurrency(payment.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" style={{ color: '#9ca3af' }}>
                    {payment.recurringType && payment.recurringType !== 'one_time' 
                      ? formatCurrency(calculateTotalToDate(payment))
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      {payment.fileCount > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff' }}>
                          {payment.fileCount} file{payment.fileCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => openFilesModal(payment)}
                        className="text-sm transition-colors"
                        style={{ color: '#22c55e' }}
                      >
                        View Files
                      </button>
                      <button
                        onClick={() => openEditModal(payment)}
                        className="text-sm transition-colors"
                        style={{ color: '#00f0ff' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePayment(payment.id)}
                        className="text-sm transition-colors"
                        style={{ color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="rounded-lg shadow-xl w-full max-w-md p-6 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#f5f5f5' }}>Add Transaction</h2>
            <form onSubmit={createPayment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Title</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g., Monthly SaaS Subscription"
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Type</label>
                  <select name="type" required className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="payment">Payment</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Recurring Type</label>
                  <select 
                    name="recurringType" 
                    required 
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                    onChange={(e) => setRecurringType(e.target.value)}
                  >
                    <option value="one_time">One-time</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {(recurringType === 'monthly' || recurringType === 'yearly') && (
                  <div>
                    <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Category</label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g., Software, Services"
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Description</label>
                  <textarea name="description" rows={2} className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Contact (Optional)</label>
                  <select name="contactId" className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="">No contact</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowModal(false); setRecurringType('one_time'); }} className="px-4 py-2 rounded-lg transition-all" style={{ border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="rounded-lg shadow-xl w-full max-w-md p-6 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#f5f5f5' }}>Edit Transaction</h2>
            <form onSubmit={updatePayment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingPayment.title || ''}
                    placeholder="e.g., Monthly SaaS Subscription"
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Type</label>
                  <select name="type" defaultValue={editingPayment.type} required className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="payment">Payment</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    defaultValue={editingPayment.amount}
                    required
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingPayment.date.split('T')[0]}
                    required
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Recurring</label>
                  <select name="recurringType" value={editRecurringType} onChange={(e) => setEditRecurringType(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="one_time">One-time</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {editRecurringType !== 'one_time' && (
                  <div>
                    <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={editingPayment.startDate?.split('T')[0] || ''}
                      className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Category</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingPayment.category || ''}
                    placeholder="e.g., Software, Services"
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Description</label>
                  <textarea name="description" defaultValue={editingPayment.description || ''} rows={2} className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Contact (Optional)</label>
                  <select name="contactId" defaultValue={editingPayment.contactId || ''} className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="">No contact</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setEditingPayment(null); setEditRecurringType('one_time'); }} className="px-4 py-2 rounded-lg transition-all" style={{ border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Files Modal */}
      {filesModalPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="rounded-lg shadow-xl w-full max-w-lg m-4 p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: '#f5f5f5' }}>Files for {filesModalPayment.paymentId}</h2>
                <p className="text-sm" style={{ color: '#9ca3af' }}>{filesModalPayment.title || 'Untitled'}</p>
              </div>
              <button onClick={() => setFilesModalPayment(null)} className="text-xl" style={{ color: '#9ca3af' }}>×</button>
            </div>
            
            {/* Upload Form */}
            <form onSubmit={uploadFile} className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#222222' }}>
              <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>Upload New File</label>
              <input
                type="file"
                name="file"
                className="w-full text-sm"
                style={{ color: '#9ca3af' }}
              />
              <button 
                type="submit" 
                disabled={uploadProgress}
                className="mt-2 px-4 py-2 rounded-lg transition-all text-sm"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid #22c55e' }}
              >
                {uploadProgress ? 'Uploading...' : 'Upload File'}
              </button>
            </form>

            {/* Files List */}
            {filesLoading ? (
              <div className="text-center py-4" style={{ color: '#9ca3af' }}>Loading...</div>
            ) : paymentFiles.length === 0 ? (
              <div className="text-center py-4" style={{ color: '#9ca3af' }}>No files attached</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {paymentFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#222222' }}>
                    <div className="flex items-center gap-3">
                      {file.fileType.startsWith('image/') ? (
                        <span className="text-2xl">🖼️</span>
                      ) : file.fileType === 'application/pdf' ? (
                        <span className="text-2xl">📄</span>
                      ) : (
                        <span className="text-2xl">📎</span>
                      )}
                      <div>
                        <a 
                          href={file.filePath} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm hover:underline"
                          style={{ color: '#00f0ff' }}
                        >
                          {file.filename}
                        </a>
                        <div className="text-xs" style={{ color: '#9ca3af' }}>
                          {file.fileType} • {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="text-sm transition-colors"
                      style={{ color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}