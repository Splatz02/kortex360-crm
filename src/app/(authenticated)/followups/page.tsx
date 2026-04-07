'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FollowUp {
  id: string
  contactId: string
  dueDate: string
  type: string
  status: string
  notes?: string
  contact: {
    firstName: string
    lastName: string
    company?: string
    phone: string
  }
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [contacts, setContacts] = useState<{id: string; firstName: string; lastName: string}[]>([])
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchData()
  }, [filterStatus])

  async function fetchData() {
    try {
      const [followUpsRes, contactsRes] = await Promise.all([
        fetch('/api/followups'),
        fetch('/api/contacts')
      ])
      
      let followUpsData = await followUpsRes.json()
      const contactsData = await contactsRes.json()
      
      if (filterStatus) {
        followUpsData = followUpsData.filter((f: FollowUp) => f.status === filterStatus)
      }
      
      setFollowUps(followUpsData)
      setContacts(contactsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createFollowUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: formData.get('contactId'),
          dueDate: formData.get('dueDate'),
          type: formData.get('type'),
          status: 'pending',
          notes: formData.get('notes'),
        }),
      })
      fetchData()
      setShowModal(false)
    } catch (error) {
      console.error('Error creating follow-up:', error)
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchData()
    } catch (error) {
      console.error('Error updating follow-up:', error)
    }
  }

  async function deleteFollowUp(id: string) {
    if (!confirm('Delete this follow-up?')) return
    try {
      await fetch(`/api/followups/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting follow-up:', error)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isOverdue = (dueDate: string) => {
    const due = new Date(dueDate)
    return due < today
  }

  const groupedFollowUps = {
    overdue: followUps.filter(f => f.status !== 'completed' && isOverdue(f.dueDate)),
    today: followUps.filter(f => {
      const due = new Date(f.dueDate)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)
      return f.status !== 'completed' && due >= today && due <= todayEnd
    }),
    upcoming: followUps.filter(f => {
      const due = new Date(f.dueDate)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)
      return f.status !== 'completed' && due > todayEnd
    }),
    completed: followUps.filter(f => f.status === 'completed'),
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>Follow-Ups</h1>
          <p style={{ color: '#9ca3af' }}>Manage your follow-up tasks</p>
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
          + Add Follow-Up
        </button>
      </div>

      {/* Filter - Neon Card */}
      <div className="rounded-lg border mb-4 p-4" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg transition-all"
          style={{ 
            backgroundColor: '#222222', 
            border: '1px solid #2a2a2a',
            color: '#f5f5f5'
          }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="snoozed">Snoozed</option>
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center" style={{ color: '#9ca3af' }}>Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Overdue - Neon Card with red accent */}
          {groupedFollowUps.overdue.length > 0 && (
            <div className="rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#2a2a2a', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#ef4444' }}>⚠️ Overdue ({groupedFollowUps.overdue.length})</h2>
              </div>
              <div className="divide-y" style={{ borderColor: '#2a2a2a' }}>
                {groupedFollowUps.overdue.map(followUp => (
                  <div key={followUp.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link href={`/contacts/${followUp.contactId}`} className="font-medium hover:text-blue-500" style={{ color: '#f5f5f5' }}>
                          {followUp.contact.firstName} {followUp.contact.lastName}
                        </Link>
                        {followUp.contact.company && (
                          <span style={{ color: '#9ca3af' }} className="ml-2">({followUp.contact.company})</span>
                        )}
                        <div className="mt-1 flex items-center gap-4 text-sm" style={{ color: '#9ca3af' }}>
                          <span className="capitalize">{followUp.type}</span>
                          <span>Due: {new Date(followUp.dueDate).toLocaleDateString()} at {new Date(followUp.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                          <span style={{ color: '#ef4444' }} className="font-medium">Overdue</span>
                        </div>
                        {followUp.notes && (
                          <p className="mt-2" style={{ color: '#9ca3af' }}>{followUp.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(followUp.id, 'completed')}
                          className="px-3 py-1 text-sm rounded-full transition-colors"
                          style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => updateStatus(followUp.id, 'snoozed')}
                          className="px-3 py-1 text-sm rounded-full transition-colors"
                          style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}
                        >
                          Snooze
                        </button>
                        <button
                          onClick={() => deleteFollowUp(followUp.id)}
                          className="px-3 py-1 text-sm rounded transition-colors"
                          style={{ color: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today - Neon Card */}
          <div className="rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>Today&apos;s Follow-Ups ({groupedFollowUps.today.length})</h2>
            </div>
            <div className="divide-y" style={{ borderColor: '#2a2a2a' }}>
              {groupedFollowUps.today.length === 0 ? (
                <div className="p-6" style={{ color: '#9ca3af' }}>No follow-ups scheduled for today</div>
              ) : (
                groupedFollowUps.today.map(followUp => (
                  <div key={followUp.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link href={`/contacts/${followUp.contactId}`} className="font-medium hover:text-blue-500" style={{ color: '#f5f5f5' }}>
                          {followUp.contact.firstName} {followUp.contact.lastName}
                        </Link>
                        {followUp.contact.company && (
                          <span style={{ color: '#9ca3af' }} className="ml-2">({followUp.contact.company})</span>
                        )}
                        <div className="mt-1 flex items-center gap-4 text-sm" style={{ color: '#9ca3af' }}>
                          <span className="capitalize">{followUp.type}</span>
                          <span>Due: {new Date(followUp.dueDate).toLocaleDateString()} at {new Date(followUp.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                        {followUp.notes && (
                          <p className="mt-2" style={{ color: '#9ca3af' }}>{followUp.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(followUp.id, 'completed')}
                          className="px-3 py-1 text-sm rounded-full transition-colors"
                          style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => deleteFollowUp(followUp.id)}
                          className="px-3 py-1 text-sm rounded transition-colors"
                          style={{ color: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming - Neon Card */}
          <div className="rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#f5f5f5' }}>Upcoming ({groupedFollowUps.upcoming.length})</h2>
            </div>
            <div className="divide-y" style={{ borderColor: '#2a2a2a' }}>
              {groupedFollowUps.upcoming.length === 0 ? (
                <div className="p-6" style={{ color: '#9ca3af' }}>No upcoming follow-ups</div>
              ) : (
                groupedFollowUps.upcoming.slice(0, 20).map(followUp => (
                  <div key={followUp.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link href={`/contacts/${followUp.contactId}`} className="font-medium hover:text-blue-500" style={{ color: '#f5f5f5' }}>
                          {followUp.contact.firstName} {followUp.contact.lastName}
                        </Link>
                        {followUp.contact.company && (
                          <span style={{ color: '#9ca3af' }} className="ml-2">({followUp.contact.company})</span>
                        )}
                        <div className="mt-1 flex items-center gap-4 text-sm" style={{ color: '#9ca3af' }}>
                          <span className="capitalize">{followUp.type}</span>
                          <span>Due: {new Date(followUp.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(followUp.id, 'completed')}
                          className="px-3 py-1 text-sm rounded-full transition-colors"
                          style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => deleteFollowUp(followUp.id)}
                          className="px-3 py-1 text-sm rounded transition-colors"
                          style={{ color: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Follow-Up Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="rounded-lg shadow-xl w-full max-w-md m-4 p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#f5f5f5' }}>Add Follow-Up</h2>
            <form onSubmit={createFollowUp}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Contact</label>
                  <select name="contactId" required className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="">Select contact...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Due Date</label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    required
                    className="mt-1 w-full px-3 py-2 rounded-lg transition-all"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Type</label>
                  <select name="type" required className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }}>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="demo">Demo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: '#9ca3af' }}>Notes</label>
                  <textarea name="notes" rows={3} className="mt-1 w-full px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: '#f5f5f5' }} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg transition-all" style={{ border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>
                  Add Follow-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}