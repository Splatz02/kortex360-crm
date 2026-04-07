'use client'

import Link from 'next/link'
import { usePermissions, showPipelineOverview, showRecentTransactions, showTodaysFollowUps, showContactDatabase, canViewDashboard } from '@/lib/permissions'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { permissions, role, isAdmin } = usePermissions()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const result = await fetch('/api/dashboard-data')
      const json = await result.json()
      setData(json)
      setLoading(false)
    }
    loadData()
  }, [])

  // Check if user can view dashboard
  if (!canViewDashboard(permissions, role)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold" style={{ color: '#f5f5f5' }}>Access Denied</h2>
        <p style={{ color: '#9ca3af' }}>You don't have permission to view the dashboard.</p>
      </div>
    )
  }

  // Check section permissions
  const showPipeline = showPipelineOverview(permissions, role)
  const showTransactions = showRecentTransactions(permissions, role)
  const showFollowUps = showTodaysFollowUps(permissions, role)
  const showContacts = showContactDatabase(permissions, role)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#00f0ff' }}></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>Dashboard</h1>
        <p style={{ color: '#9ca3af' }}>Kortex CRM Command Center</p>
      </div>

      {/* Pipeline & Deals Summary - Neon Card */}
      {showPipeline && (
      <div className="rounded-lg border mb-6" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>Pipeline Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {data.pipelineSummary.map((stage: any) => (
              <Link
                key={stage.value}
                href={`/pipeline?stage=${stage.value}`}
                className="p-4 rounded-lg border-2 transition-all card-neon-hover"
                style={{ 
                  borderColor: stage.color, 
                  backgroundColor: `${stage.color}15`,
                }}
              >
                <div className="text-sm font-medium" style={{ color: '#9ca3af' }}>{stage.label}</div>
                <div className="text-2xl font-bold mt-1" style={{ 
                  color: stage.color,
                  textShadow: `0 0 10px ${stage.color}`
                }}>
                  {stage.count}
                </div>
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  {formatCurrency(stage.totalValue)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-Ups - Neon Card */}
        {showFollowUps && (
        <div className="rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
            <h2 className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>Today&apos;s Follow-Ups</h2>
            <Link href="/followups" className="text-sm hover:underline" style={{ color: '#00f0ff' }}>
              View All →
            </Link>
          </div>
          <div className="p-6">
            {data.overdueFollowUps.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2" style={{ color: '#ef4444' }}>⚠️ Overdue ({data.overdueFollowUps.length})</h3>
                <div className="space-y-2">
                  {data.overdueFollowUps.slice(0, 3).map((followUp: any) => (
                    <Link
                      key={followUp.id}
                      href={`/contacts/${followUp.contactId}`}
                      className="block p-3 rounded-lg transition-colors card-neon-hover"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid transparent' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium" style={{ color: '#f5f5f5' }}>
                            {followUp.contact.firstName} {followUp.contact.lastName}
                            <span className="text-sm ml-2" style={{ color: '#9ca3af' }}>
                              {new Date(followUp.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-sm" style={{ color: '#9ca3af' }}>{followUp.type}</div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                          Overdue
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>Today ({data.todayFollowUps.length})</h3>
              {data.todayFollowUps.length === 0 ? (
                <p className="text-sm" style={{ color: '#6b7280' }}>No follow-ups scheduled for today</p>
              ) : (
                <div className="space-y-2">
                  {data.todayFollowUps.slice(0, 5).map((followUp: any) => (
                    <Link
                      key={followUp.id}
                      href={`/contacts/${followUp.contactId}`}
                      className="block p-3 rounded-lg transition-colors card-neon-hover"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium" style={{ color: '#f5f5f5' }}>
                            {followUp.contact.firstName} {followUp.contact.lastName}
                            <span className="text-sm ml-2" style={{ color: '#00f0ff' }}>
                              {new Date(followUp.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-sm capitalize" style={{ color: '#9ca3af' }}>{followUp.type}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          followUp.status === 'completed' 
                            ? 'bg-green-900 text-green-400'
                            : 'bg-yellow-900 text-yellow-400'
                        }`}>
                          {followUp.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Recent Payments/Expenses - Neon Card */}
        {showTransactions && (
        <div className="rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
            <h2 className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>Recent Transactions</h2>
            <Link href="/payments" className="text-sm hover:underline" style={{ color: '#00f0ff' }}>
              View All →
            </Link>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(57, 255, 20, 0.1)', borderColor: 'rgba(57, 255, 20, 0.3)' }}>
                <div className="text-sm" style={{ color: '#39ff14' }}>Total Payments</div>
                <div className="text-xl font-bold" style={{ color: '#39ff14', textShadow: '0 0 8px #39ff14' }}>{formatCurrency(data.totalPayments)}</div>
              </div>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(255, 0, 255, 0.1)', borderColor: 'rgba(255, 0, 255, 0.3)' }}>
                <div className="text-sm" style={{ color: '#ff00ff' }}>Total Expenses</div>
                <div className="text-xl font-bold" style={{ color: '#ff00ff', textShadow: '0 0 8px #ff00ff' }}>{formatCurrency(data.totalExpenses)}</div>
              </div>
            </div>
            {data.payments.length === 0 ? (
              <p className="text-sm" style={{ color: '#6b7280' }}>No transactions recorded yet</p>
            ) : (
              <div className="space-y-2">
                {data.payments.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a' }}>
                    <div>
                      <div className="font-medium" style={{ color: '#f5f5f5' }}>{payment.description || payment.category}</div>
                      <div className="text-sm" style={{ color: '#6b7280' }}>{new Date(payment.date).toLocaleDateString()}</div>
                    </div>
                    <span className={`font-medium ${
                      payment.type === 'payment' ? 'text-green-400' : 'text-pink-400'
                    }`}>
                      {payment.type === 'payment' ? '+' : '-'}{formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Contact Database Snapshot - Neon Card */}
        {showContacts && (
        <div className="rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
            <h2 className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>Contact Database</h2>
            <Link href="/contacts" className="text-sm hover:underline" style={{ color: '#00f0ff' }}>
              View All →
            </Link>
          </div>
          <div className="p-6">
            <div className="text-4xl font-bold mb-4" style={{ color: '#00f0ff', textShadow: '0 0 15px #00f0ff' }}>{data.contacts.length}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#222222', borderColor: '#2a2a2a' }}>
                <div className="text-sm" style={{ color: '#6b7280' }}>New</div>
                <div className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>{data.contactStatusCounts.new}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#222222', borderColor: '#2a2a2a' }}>
                <div className="text-sm" style={{ color: '#6b7280' }}>Contacted</div>
                <div className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>{data.contactStatusCounts.contacted}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#222222', borderColor: '#2a2a2a' }}>
                <div className="text-sm" style={{ color: '#6b7280' }}>Qualified</div>
                <div className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>{data.contactStatusCounts.qualified}</div>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#222222', borderColor: '#2a2a2a' }}>
                <div className="text-sm" style={{ color: '#6b7280' }}>Converted</div>
                <div className="text-lg font-semibold" style={{ color: '#39ff14', textShadow: '0 0 8px #39ff14' }}>{data.contactStatusCounts.converted}</div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}