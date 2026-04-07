'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PIPELINE_STAGES } from '@/types/crm'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company?: string
  pipelineStatus: string
  oneTimeDealValue: number
  monthlyDealValue: number
  icpStatus: string
}

function PipelineContent() {
  const searchParams = useSearchParams()
  const env = searchParams.get('env') || 'cold_calling'
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    fetchContacts()
  }, [env])

  async function fetchContacts() {
    try {
      const params = new URLSearchParams()
      params.set('environment', env)
      
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDrop(contactId: string, newStage: string) {
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStatus: newStage }),
      })
      setContacts(prev => 
        prev.map(c => 
          c.id === contactId ? { ...c, pipelineStatus: newStage } : c
        )
      )
    } catch (error) {
      console.error('Error updating pipeline status:', error)
    }
    setDraggingId(null)
  }

  async function handleDeleteContact(id: string, firstName: string, lastName: string) {
    if (!confirm(`Are you sure you want to delete ${firstName} ${lastName}?`)) return
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getContactsByStage = (stage: string) => {
    return contacts.filter(c => c.pipelineStatus === stage)
  }

  const getStageTotal = (stage: string) => {
    return getContactsByStage(stage).reduce((sum, c) => sum + c.oneTimeDealValue + c.monthlyDealValue, 0)
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>Pipeline Board</h1>
        <p style={{ color: '#9ca3af' }}>Drag contacts between stages to update pipeline status</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {PIPELINE_STAGES.map(stage => {
          const stageContacts = getContactsByStage(stage.value)
          const totalValue = getStageTotal(stage.value)
          
          return (
            <div
              key={stage.value}
              className="flex-shrink-0 w-72 flex flex-col rounded-lg border transition-all"
              style={{ 
                backgroundColor: '#1a1a1a', 
                borderColor: '#2a2a2a',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => draggingId && handleDrop(draggingId, stage.value)}
            >
              {/* Stage Header - Neon Glow */}
              <div 
                className="px-4 py-3 rounded-t-lg"
                style={{ 
                  backgroundColor: `${stage.color}20`,
                  borderBottom: `2px solid ${stage.color}`,
                  boxShadow: `0 0 15px ${stage.color}40`
                }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold" style={{ color: stage.color, textShadow: `0 0 10px ${stage.color}` }}>{stage.label}</h3>
                  <span className="text-sm px-2 py-0.5 rounded-full" style={{ 
                    backgroundColor: stage.color, 
                    color: '#0a0a0a',
                    fontWeight: 'bold'
                  }}>
                    {stageContacts.length}
                  </span>
                </div>
                <div className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                  {formatCurrency(totalValue)}
                </div>
              </div>
              
              {/* Stage Cards */}
              <div className="flex-1 p-2 overflow-y-auto space-y-2" style={{ minHeight: '200px' }}>
                {loading ? (
                  <div className="p-4 text-center" style={{ color: '#6b7280' }}>Loading...</div>
                ) : stageContacts.length === 0 ? (
                  <div className="p-4 text-center" style={{ color: '#4b5563', fontSize: '0.875rem' }}>
                    No contacts
                  </div>
                ) : (
                  stageContacts.map(contact => (
                    <div
                      key={contact.id}
                      draggable
                      onDragStart={() => setDraggingId(contact.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className="rounded-lg border p-3 cursor-move transition-all card-neon-hover"
                      style={{
                        backgroundColor: '#222222',
                        borderColor: draggingId === contact.id ? '#00f0ff' : '#2a2a2a',
                        opacity: draggingId === contact.id ? 0.5 : 1,
                        boxShadow: draggingId === contact.id ? '0 0 15px rgba(0, 240, 255, 0.5)' : 'none',
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <Link href={`/contacts/${contact.id}`}>
                          <div className="font-medium transition-all" style={{ color: '#f5f5f5' }}>
                            {contact.firstName} {contact.lastName}
                          </div>
                        </Link>
                        <button
                          onClick={() => handleDeleteContact(contact.id, contact.firstName, contact.lastName)}
                          className="p-1 rounded transition-colors hover:bg-red-900"
                          style={{ color: '#ef4444' }}
                          title="Delete contact"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                      {contact.company && (
                        <div className="text-sm" style={{ color: '#6b7280' }}>{contact.company}</div>
                      )}
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>
                          {formatCurrency(contact.oneTimeDealValue + contact.monthlyDealValue)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          contact.icpStatus === 'Hot' ? 'bg-red-900 text-red-400' :
                          contact.icpStatus === 'Warm' ? 'bg-yellow-900 text-yellow-400' :
                          contact.icpStatus === 'Cold' ? 'bg-blue-900 text-blue-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {contact.icpStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: '#6b7280' }}>Loading...</div>}>
      <PipelineContent />
    </Suspense>
  )
}