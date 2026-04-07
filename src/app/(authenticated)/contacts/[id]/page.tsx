'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PIPELINE_STAGES } from '@/types/crm'
import { usePermissions, canChangeContactStatus, canChangePipelineStatus } from '@/lib/permissions'

interface Contact {
  id: string
  firstName: string
  lastName: string
  title?: string
  company?: string
  email?: string
  phone: string
  website?: string
  linkedinUrl?: string
  address?: string
  state?: string
  country?: string
  timezone?: string
  icpStatus: string
  serviceQualifier?: string
  phoneType: string
  contactStatus: string
  interestStatus: string
  smsOptIn: string
  oneTimeDealValue: number
  monthlyDealValue: number
  pipelineStatus: string
  assetLink?: string
  assetNotes?: string
  demoLinks?: string
  callComments?: string
  followUpNote?: string
  leadNotes?: string
  outreachHistory?: string
  environment: string
  followUps: FollowUp[]
  payments: Payment[]
  communications: Communication[]
}

interface FollowUp {
  id: string
  dueDate: string
  type: string
  status: string
  notes?: string
}

interface Payment {
  id: string
  type: string
  amount: number
  category?: string
  description?: string
  date: string
}

interface Communication {
  id: string
  type: string
  direction: string
  content?: string
  timestamp: string
  status: string
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: session } = useSession()
  const { permissions, role } = usePermissions()

  // Permission checks
  const canChangeStatus = canChangeContactStatus(permissions, role)
  const canChangePipeline = canChangePipelineStatus(permissions, role)

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [showCallLogModal, setShowCallLogModal] = useState(false)

  useEffect(() => {
    if (id) fetchContact()
  }, [id])

  async function fetchContact() {
    try {
      const res = await fetch(`/api/contacts/${id}`)
      if (res.ok) {
        const data = await res.json()
        setContact(data)
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateContact(field: string, value: string | number) {
    if (!contact) return
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        setContact({ ...contact, [field]: value })
      }
    } catch (error) {
      console.error('Error updating contact:', error)
    }
  }

  async function addFollowUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: id,
          dueDate: formData.get('dueDate'),
          type: formData.get('type'),
          status: 'pending',
          notes: formData.get('notes'),
        }),
      })
      fetchContact()
      setShowFollowUpModal(false)
    } catch (error) {
      console.error('Error creating follow-up:', error)
    }
  }

  async function addCallLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: id,
          type: 'call',
          direction: formData.get('direction'),
          content: formData.get('content'),
          status: 'manual',
        }),
      })
      fetchContact()
      setShowCallLogModal(false)
    } catch (error) {
      console.error('Error creating call log:', error)
    }
  }

  async function deleteContact() {
    if (!confirm('Are you sure you want to delete this contact?')) return
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      router.push('/contacts')
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

  if (loading) {
    return <div className="p-8 text-center" style={{ color: '#6b7280', backgroundColor: '#0a0a0a' }}>Loading contact...</div>
  }

  if (!contact) {
    return <div className="p-8 text-center" style={{ color: '#6b7280', backgroundColor: '#0a0a0a' }}>Contact not found</div>
  }

  const cardStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '0.5rem',
  }

  const neonBlue = '#00f0ff'
  const textLight = '#f5f5f5'
  const textMuted = '#6b7280'

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '1rem' }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/contacts" className="text-sm mb-2 block hover:underline" style={{ color: neonBlue, textShadow: `0 0 5px ${neonBlue}` }}>
            ← Back to Contacts
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: textLight }}>
            {contact.firstName} {contact.lastName}
          </h1>
          <p style={{ color: textMuted }}>
            {contact.title} {contact.title && contact.company && 'at'} {contact.company}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={deleteContact}
            className="px-4 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.15)', 
              border: '1px solid #ef4444',
              color: '#ef4444',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-lg mb-6" style={cardStyle}>
        <div className="px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className="pb-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'details' ? neonBlue : 'transparent',
                color: activeTab === 'details' ? neonBlue : textMuted,
                textShadow: activeTab === 'details' ? `0 0 10px ${neonBlue}` : 'none',
              }}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('communication')}
              className="pb-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'communication' ? neonBlue : 'transparent',
                color: activeTab === 'communication' ? neonBlue : textMuted,
                textShadow: activeTab === 'communication' ? `0 0 10px ${neonBlue}` : 'none',
              }}
            >
              Communication
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className="pb-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'notes' ? neonBlue : 'transparent',
                color: activeTab === 'notes' ? neonBlue : textMuted,
                textShadow: activeTab === 'notes' ? `0 0 10px ${neonBlue}` : 'none',
              }}
            >
              Notes
            </button>
          </div>
        </div>

        {activeTab === 'details' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium uppercase mb-4" style={{ color: textMuted }}>Basic Info</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm" style={{ color: textMuted }}>First Name</label>
                      <input
                        type="text"
                        value={contact.firstName}
                        onChange={(e) => updateContact('firstName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm" style={{ color: textMuted }}>Last Name</label>
                      <input
                        type="text"
                        value={contact.lastName}
                        onChange={(e) => updateContact('lastName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm" style={{ color: textMuted }}>Title</label>
                      <input
                        type="text"
                        value={contact.title || ''}
                        onChange={(e) => updateContact('title', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                        placeholder="Job title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm" style={{ color: textMuted }}>Company</label>
                      <input
                        type="text"
                        value={contact.company || ''}
                        onChange={(e) => updateContact('company', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                        placeholder="Company name"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase mb-4" style={{ color: textMuted }}>Contact Info</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Email</label>
                    <input
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => updateContact('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Phone</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={contact.phone || ''}
                        onChange={(e) => updateContact('phone', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                        placeholder="+1 (555) 123-4567"
                      />
                      <select
                        value={contact.phoneType}
                        onChange={(e) => updateContact('phoneType', e.target.value)}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      >
                        <option value="Mobile" style={{ color: textLight }}>Mobile</option>
                        <option value="Landline" style={{ color: textLight }}>Landline</option>
                        <option value="VoIP" style={{ color: textLight }}>VoIP</option>
                        <option value="Unknown" style={{ color: textLight }}>Unknown</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>LinkedIn</label>
                    <input
                      type="url"
                      value={contact.linkedinUrl || ''}
                      onChange={(e) => updateContact('linkedinUrl', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Website</label>
                    <input
                      type="url"
                      value={contact.website || ''}
                      onChange={(e) => updateContact('website', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Address</label>
                    <input
                      type="text"
                      value={contact.address || ''}
                      onChange={(e) => updateContact('address', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg mb-2"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      placeholder="Street address"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={contact.state || ''}
                        onChange={(e) => updateContact('state', e.target.value)}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                        placeholder="State"
                      />
                      <input
                        type="text"
                        value={contact.country || ''}
                        onChange={(e) => updateContact('country', e.target.value)}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Timezone</label>
                    <input
                      type="text"
                      value={contact.timezone || ''}
                      onChange={(e) => updateContact('timezone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                      placeholder="America/New_York"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium uppercase mb-4" style={{ color: textMuted }}>Lead Intelligence</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Pipeline Status</label>
                    {canChangePipeline ? (
                      <select
                        value={contact.pipelineStatus}
                        onChange={(e) => updateContact('pipelineStatus', e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg"
                        style={{ 
                          backgroundColor: '#222222', 
                          border: '1px solid #2a2a2a',
                          color: textLight
                        }}
                      >
                        {PIPELINE_STAGES.map(stage => (
                          <option key={stage.value} value={stage.value} style={{ color: textLight }}>{stage.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-1 w-full px-3 py-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}>
                        {PIPELINE_STAGES.find(s => s.value === contact.pipelineStatus)?.label || contact.pipelineStatus}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>One-Time Deal Value</label>
                    <input
                      type="number"
                      value={contact.oneTimeDealValue}
                      onChange={(e) => updateContact('oneTimeDealValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: '#222222', 
                        border: '1px solid #2a2a2a',
                        color: textLight
                      }}
                      placeholder="0"
                    />
                    <div className="text-lg font-bold mt-1" style={{ color: textLight, textShadow: `0 0 10px ${neonBlue}` }}>{formatCurrency(contact.oneTimeDealValue)}</div>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Monthly Deal Value</label>
                    <input
                      type="number"
                      value={contact.monthlyDealValue}
                      onChange={(e) => updateContact('monthlyDealValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: '#222222', 
                        border: '1px solid #2a2a2a',
                        color: textLight
                      }}
                      placeholder="0"
                    />
                    <div className="text-lg font-bold mt-1" style={{ color: textLight, textShadow: `0 0 10px ${neonBlue}` }}>{formatCurrency(contact.monthlyDealValue)}</div>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Demo Links</label>
                    <div className="space-y-2 mt-2">
                      {contact.demoLinks ? (
                        (() => {
                          try {
                            const links = JSON.parse(contact.demoLinks)
                            return links.map((link: {title: string, link: string}, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a' }}>
                                <a href={link.link.startsWith('http') ? link.link : `https://${link.link}`} target="_blank" rel="noopener noreferrer" className="text-sm flex-1" style={{ color: neonBlue }}>
                                  {link.title}
                                </a>
                                <button
                                  onClick={() => {
                                    const newLinks = JSON.parse(contact.demoLinks || '[]').filter((_: any, i: number) => i !== idx)
                                    updateContact('demoLinks', JSON.stringify(newLinks))
                                  }}
                                  className="p-1 rounded hover:bg-red-900"
                                  style={{ color: '#ef4444' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          } catch {
                            return null
                          }
                        })()
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const newLink = prompt('Enter demo link title:')
                          if (newLink) {
                            const newLinkUrl = prompt('Enter demo link URL:')
                            if (newLinkUrl) {
                              const existingLinks = contact.demoLinks ? JSON.parse(contact.demoLinks) : []
                              existingLinks.push({ title: newLink, link: newLinkUrl })
                              updateContact('demoLinks', JSON.stringify(existingLinks))
                            }
                          }
                        }}
                        className="text-sm px-3 py-1 rounded-lg transition-all"
                        style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#a855f7', border: '1px solid #a855f7' }}
                      >
                        + Add Demo Link
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>ICP Status</label>
                    <select
                      value={contact.icpStatus}
                      onChange={(e) => updateContact('icpStatus', e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: '#222222', 
                        border: '1px solid #2a2a2a',
                        color: textLight
                      }}
                    >
                      <option value="Hot" style={{ color: textLight }}>Hot</option>
                      <option value="Warm" style={{ color: textLight }}>Warm</option>
                      <option value="Cold" style={{ color: textLight }}>Cold</option>
                      <option value="Nurture" style={{ color: textLight }}>Nurture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Contact Status</label>
                    {canChangeStatus ? (
                      <select
                        value={contact.contactStatus}
                        onChange={(e) => updateContact('contactStatus', e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg"
                        style={{ 
                          backgroundColor: '#222222', 
                          border: '1px solid #2a2a2a',
                          color: textLight
                        }}
                      >
                        <option value="New" style={{ color: textLight }}>New</option>
                        <option value="Contacted" style={{ color: textLight }}>Contacted</option>
                        <option value="Qualified" style={{ color: textLight }}>Qualified</option>
                        <option value="Converted" style={{ color: textLight }}>Converted</option>
                        <option value="Lost" style={{ color: textLight }}>Lost</option>
                      </select>
                    ) : (
                      <div className="mt-1 w-full px-3 py-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}>
                        {contact.contactStatus}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Interest Status</label>
                    <select
                      value={contact.interestStatus}
                      onChange={(e) => updateContact('interestStatus', e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: '#222222', 
                        border: '1px solid #2a2a2a',
                        color: textLight
                      }}
                    >
                      <option value="Interested" style={{ color: textLight }}>Interested</option>
                      <option value="Not Interested" style={{ color: textLight }}>Not Interested</option>
                      <option value="Pending" style={{ color: textLight }}>Pending</option>
                      <option value="Not Yet Asked" style={{ color: textLight }}>Not Yet Asked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>SMS Opt-In</label>
                    <select
                      value={contact.smsOptIn}
                      onChange={(e) => updateContact('smsOptIn', e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: '#222222', 
                        border: '1px solid #2a2a2a',
                        color: textLight
                      }}
                    >
                      <option value="Yes" style={{ color: textLight }}>Yes</option>
                      <option value="No" style={{ color: textLight }}>No</option>
                      <option value="Pending" style={{ color: textLight }}>Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm" style={{ color: textMuted }}>Service Qualifier</label>
                    <select
                      value={contact.serviceQualifier || ''}
                      onChange={(e) => updateContact('serviceQualifier', e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: '#222222', 
                        border: '1px solid #2a2a2a',
                        color: textLight
                      }}
                    >
                      <option value="" style={{ color: textLight }}>Select...</option>
                      <option value="Enterprise" style={{ color: textLight }}>Enterprise</option>
                      <option value="SMB" style={{ color: textLight }}>SMB</option>
                      <option value="Startup" style={{ color: textLight }}>Startup</option>
                      <option value="Consumer" style={{ color: textLight }}>Consumer</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: textLight }}>Communication Center</h3>
                <p className="text-sm" style={{ color: textMuted }}>Phone: {contact.phone}</p>
                <p className="text-sm" style={{ color: textMuted }}>SMS Opt-In: {contact.smsOptIn}</p>
              </div>
              <button
                onClick={() => setShowCallLogModal(true)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ 
                  backgroundColor: 'rgba(0, 240, 255, 0.15)', 
                  color: neonBlue,
                  border: `1px solid ${neonBlue}`,
                  boxShadow: `0 0 10px ${neonBlue}30`
                }}
              >
                + Log Call
              </button>
            </div>

            {/* SMS Placeholder */}
            <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: '#222222' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium" style={{ color: textLight }}>SMS Messages</h4>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>
                  Coming Soon
                </span>
              </div>
              <p className="text-sm" style={{ color: textMuted }}>
                SMS functionality will be available in a future update. Manual call logging is now available.
              </p>
            </div>

            {/* Call Log History */}
            <div>
              <h4 className="font-medium mb-4" style={{ color: textLight }}>Communication History</h4>
              {contact.communications.length === 0 ? (
                <p className="text-sm" style={{ color: textMuted }}>No communications logged yet</p>
              ) : (
                <div className="space-y-3">
                  {contact.communications.map(comm => (
                    <div key={comm.id} className="p-3 rounded-lg" style={{ backgroundColor: '#222222' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs px-2 py-1 rounded-full" style={{
                            backgroundColor: comm.direction === 'outbound' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: comm.direction === 'outbound' ? '#3b82f6' : '#22c55e'
                          }}>
                            {comm.direction}
                          </span>
                          <span className="text-xs px-2 py-1 ml-2 rounded-full" style={{ backgroundColor: '#333333', color: textMuted }}>
                            {comm.type}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: textMuted }}>
                          {new Date(comm.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {comm.content && (
                        <p className="mt-2" style={{ color: textLight }}>{comm.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium uppercase mb-2" style={{ color: textMuted }}>Lead Notes</h3>
                <textarea
                  value={contact.leadNotes || ''}
                  onChange={(e) => updateContact('leadNotes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: textLight
                  }}
                  placeholder="Add notes about this lead..."
                />
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase mb-2" style={{ color: textMuted }}>Call Comments</h3>
                <textarea
                  value={contact.callComments || ''}
                  onChange={(e) => updateContact('callComments', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: textLight
                  }}
                  placeholder="Record call details..."
                />
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase mb-2" style={{ color: textMuted }}>Follow-Up Notes</h3>
                <textarea
                  value={contact.followUpNote || ''}
                  onChange={(e) => updateContact('followUpNote', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: textLight
                  }}
                  placeholder="Follow-up reminders..."
                />
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase mb-2" style={{ color: textMuted }}>Outreach History</h3>
                <textarea
                  value={contact.outreachHistory || ''}
                  onChange={(e) => updateContact('outreachHistory', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: textLight
                  }}
                  placeholder="Track all outreach attempts..."
                />
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase mb-2" style={{ color: textMuted }}>Asset Link</h3>
                <input
                  type="url"
                  value={contact.assetLink || ''}
                  onChange={(e) => updateContact('assetLink', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: textLight
                  }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <h3 className="text-sm font-medium uppercase mb-2" style={{ color: textMuted }}>Asset Notes</h3>
                <textarea
                  value={contact.assetNotes || ''}
                  onChange={(e) => updateContact('assetNotes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: textLight
                  }}
                  placeholder="Notes about the asset..."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Follow-Ups Section */}
      <div className="rounded-lg mb-6" style={cardStyle}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
          <h2 className="text-lg font-semibold" style={{ color: textLight }}>Follow-Ups</h2>
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ 
              backgroundColor: 'rgba(0, 240, 255, 0.15)', 
              color: neonBlue,
              border: `1px solid ${neonBlue}`,
              boxShadow: `0 0 10px ${neonBlue}30`
            }}
          >
            + Add Follow-Up
          </button>
        </div>
        <div className="p-6">
          {contact.followUps.length === 0 ? (
            <p className="text-sm" style={{ color: textMuted }}>No follow-ups scheduled</p>
          ) : (
            <div className="space-y-2">
              {contact.followUps.map(followUp => (
                <div key={followUp.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: '#222222' }}>
                  <div>
                    <span className="font-medium capitalize" style={{ color: textLight }}>{followUp.type}</span>
                    <span className="mx-2" style={{ color: '#444' }}>•</span>
                    <span className="text-sm" style={{ color: textMuted }}>
                      {new Date(followUp.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    backgroundColor: followUp.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                    followUp.status === 'snoozed' ? 'rgba(234, 179, 8, 0.2)' :
                    'rgba(59, 130, 246, 0.2)',
                    color: followUp.status === 'completed' ? '#22c55e' :
                    followUp.status === 'snoozed' ? '#eab308' :
                    '#3b82f6'
                  }}>
                    {followUp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Follow-Up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="rounded-lg shadow-xl w-full max-w-md m-4 p-6" style={{ backgroundColor: '#1a1a1a', border: `1px solid ${neonBlue}`, boxShadow: `0 0 30px ${neonBlue}30` }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: neonBlue, textShadow: `0 0 10px ${neonBlue}` }}>Add Follow-Up</h2>
            <form onSubmit={addFollowUp}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium" style={{ color: textMuted }}>Due Date</label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    required
                    className="mt-1 w-full px-3 py-2 rounded-lg"
                    style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: textMuted }}>Type</label>
                  <select name="type" required className="mt-1 w-full px-3 py-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}>
                    <option value="call" style={{ color: textLight }}>Call</option>
                    <option value="email" style={{ color: textLight }}>Email</option>
                    <option value="meeting" style={{ color: textLight }}>Meeting</option>
                    <option value="demo" style={{ color: textLight }}>Demo</option>
                    <option value="other" style={{ color: textLight }}>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: textMuted }}>Notes</label>
                  <textarea name="notes" rows={3} className="mt-1 w-full px-3 py-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowFollowUpModal(false)} className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'transparent', border: '1px solid #2a2a2a', color: textMuted }}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', border: `1px solid ${neonBlue}`, color: neonBlue, boxShadow: `0 0 10px ${neonBlue}30` }}>
                  Add Follow-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call Log Modal */}
      {showCallLogModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
          <div className="rounded-lg shadow-xl w-full max-w-md m-4 p-6" style={{ backgroundColor: '#1a1a1a', border: `1px solid ${neonBlue}`, boxShadow: `0 0 30px ${neonBlue}30` }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: neonBlue, textShadow: `0 0 10px ${neonBlue}` }}>Log Call</h2>
            <form onSubmit={addCallLog}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium" style={{ color: textMuted }}>Direction</label>
                  <select name="direction" required className="mt-1 w-full px-3 py-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }}>
                    <option value="outbound" style={{ color: textLight }}>Outbound</option>
                    <option value="inbound" style={{ color: textLight }}>Inbound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: textMuted }}>Notes</label>
                  <textarea name="content" rows={4} className="mt-1 w-full px-3 py-2 rounded-lg" style={{ backgroundColor: '#222222', border: '1px solid #2a2a2a', color: textLight }} placeholder="Call notes..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCallLogModal(false)} className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'transparent', border: '1px solid #2a2a2a', color: textMuted }}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', border: `1px solid ${neonBlue}`, color: neonBlue, boxShadow: `0 0 10px ${neonBlue}30` }}>
                  Log Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}