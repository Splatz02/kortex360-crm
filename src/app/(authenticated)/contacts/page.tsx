'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getStageColor, getStageLabel, PIPELINE_STAGES } from '@/types/crm'
import { usePermissions, canCreateContact, canEditContact, canDeleteContact, canChangePipelineStatus, canChangeContactStatus } from '@/lib/permissions'
import * as XLSX from 'xlsx'

interface Contact {
  id: string
  firstName: string
  lastName: string
  title?: string
  company?: string
  email?: string
  phone: string
  website?: string
  pipelineStatus: string
  oneTimeDealValue: number
  monthlyDealValue: number
  icpStatus: string
  contactStatus: string
  environment: string
  demoLinks?: string
  createdAt: string
}

function ContactsContent() {
  const searchParams = useSearchParams()
  const env = searchParams.get('env') || 'cold_calling'
  const { data: session } = useSession()
  const { permissions, role } = usePermissions()
  
  // Permission checks
  const canCreate = canCreateContact(permissions, role)
  const canEdit = canEditContact(permissions, role)
  const canDelete = canDeleteContact(permissions, role)
  const canChangePipeline = canChangePipelineStatus(permissions, role)
  const canChangeStatus = canChangeContactStatus(permissions, role)
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPipeline, setFilterPipeline] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openPipelineDropdown, setOpenPipelineDropdown] = useState<string | null>(null)
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null)
  const [updatingPipeline, setUpdatingPipeline] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchContacts()
  }, [env, filterStatus, filterPipeline])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenPipelineDropdown(null)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setOpenStatusDropdown(null)
      }
    }
    if (openPipelineDropdown || openStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openPipelineDropdown, openStatusDropdown])

  async function fetchContacts() {
    try {
      const params = new URLSearchParams()
      if (env) params.set('environment', env)
      
      const res = await fetch(`/api/contacts?${params}`)
      let data = await res.json()
      
      if (filterStatus) {
        data = data.filter((c: Contact) => c.contactStatus === filterStatus)
      }
      if (filterPipeline) {
        data = data.filter((c: Contact) => c.pipelineStatus === filterPipeline)
      }
      
      setContacts(data)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      contact.firstName.toLowerCase().includes(search) ||
      contact.lastName.toLowerCase().includes(search) ||
      contact.company?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search)
    )
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
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

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function selectAll() {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)))
    }
  }

  async function handlePipelineChange(contactId: string, newStage: string) {
    setUpdatingPipeline(contactId)
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStatus: newStage }),
      })
      // Update local state immediately
      setContacts(contacts.map(c => 
        c.id === contactId ? { ...c, pipelineStatus: newStage } : c
      ))
      setOpenPipelineDropdown(null)
    } catch (error) {
      console.error('Error updating pipeline status:', error)
    } finally {
      setUpdatingPipeline(null)
    }
  }

  async function handleStatusChange(contactId: string, newStatus: string) {
    setUpdatingStatus(contactId)
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactStatus: newStatus }),
      })
      // Update local state immediately
      setContacts(contacts.map(c => 
        c.id === contactId ? { ...c, contactStatus: newStatus } : c
      ))
      setOpenStatusDropdown(null)
    } catch (error) {
      console.error('Error updating contact status:', error)
    } finally {
      setUpdatingStatus(null)
    }
  }

  async function handleBulkDelete() {
    const count = selectedIds.size
    if (!confirm(`Are you sure you want to delete ${count} contact${count > 1 ? 's' : ''}? This will also delete all related deals, followups, payments, and communications.`)) return
    try {
      await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      setSelectedIds(new Set())
      fetchContacts()
    } catch (error) {
      console.error('Error bulk deleting contacts:', error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>Contacts</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && canDelete && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                color: '#ef4444',
                border: '1px solid #ef4444',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
              }}
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: 'rgba(168, 85, 247, 0.15)', 
              color: '#a855f7',
              border: '1px solid #a855f7',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.3)'
            }}
          >
            Import Leads
          </button>
          {canCreate && (
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
              + Add Contact
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Link
          href="/contacts?env=cold_calling"
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            env === 'cold_calling' ? 'border' : ''
          }`}
          style={{
            backgroundColor: env === 'cold_calling' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
            color: env === 'cold_calling' ? '#00f0ff' : '#9ca3af',
            borderColor: env === 'cold_calling' ? '#00f0ff' : 'transparent',
            boxShadow: env === 'cold_calling' ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
          }}
        >
          Cold Calling
        </Link>
        <Link
          href="/contacts?env=rvm_outreach"
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            env === 'rvm_outreach' ? 'border' : ''
          }`}
          style={{
            backgroundColor: env === 'rvm_outreach' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
            color: env === 'rvm_outreach' ? '#00f0ff' : '#9ca3af',
            borderColor: env === 'rvm_outreach' ? '#00f0ff' : 'transparent',
            boxShadow: env === 'rvm_outreach' ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
          }}
        >
          RVM/Outreach
        </Link>
      </div>

      {/* Search Filters - Neon Card */}
      <div className="rounded-lg border mb-4" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        <div className="p-4 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: '#222222', 
              border: '1px solid #2a2a2a',
              color: '#f5f5f5'
            }}
          />
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
            <option value="" style={{ color: '#f5f5f5' }}>All Statuses</option>
            <option value="New" style={{ color: '#f5f5f5' }}>New</option>
            <option value="Contacted" style={{ color: '#f5f5f5' }}>Contacted</option>
            <option value="Qualified" style={{ color: '#f5f5f5' }}>Qualified</option>
            <option value="Converted" style={{ color: '#f5f5f5' }}>Converted</option>
            <option value="Lost" style={{ color: '#f5f5f5' }}>Lost</option>
          </select>
          <select
            value={filterPipeline}
            onChange={(e) => setFilterPipeline(e.target.value)}
            className="px-3 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: '#222222', 
              border: '1px solid #2a2a2a',
              color: '#f5f5f5'
            }}
          >
            <option value="" style={{ color: '#f5f5f5' }}>All Pipeline Stages</option>
            {PIPELINE_STAGES.map(stage => (
              <option key={stage.value} value={stage.value} style={{ color: '#f5f5f5' }}>{stage.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Table - Neon Card */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: '#6b7280' }}>Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#6b7280' }}>No contacts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: '#2a2a2a' }}>
              <thead style={{ backgroundColor: '#222222' }}>
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#00f0ff' }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Website</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Pipeline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>One-Time Deal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Monthly Deal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>ICP Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Contact Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Demo Links</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#2a2a2a' }}>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="transition-colors card-neon-hover" style={{ borderColor: '#2a2a2a' }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#00f0ff' }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canEdit ? (
                        <Link href={`/contacts/${contact.id}`} className="font-medium transition-all hover:underline" style={{ color: '#00f0ff', textShadow: '0 0 5px #00f0ff' }}>
                          {contact.firstName} {contact.lastName}
                        </Link>
                      ) : (
                        <span className="font-medium" style={{ color: '#9ca3af' }}>
                          {contact.firstName} {contact.lastName}
                        </span>
                      )}
                      <div className="text-sm" style={{ color: '#6b7280' }}>{contact.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#f5f5f5' }}>
                      {contact.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div style={{ color: '#f5f5f5' }}>{contact.company || '-'}</div>
                      <div className="text-sm" style={{ color: '#6b7280' }}>{contact.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.website ? (
                        <a 
                          href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: '#00f0ff', textShadow: '0 0 5px #00f0ff' }}
                        >
                          {contact.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => canChangePipeline ? setOpenPipelineDropdown(openPipelineDropdown === contact.id ? null : contact.id) : null}
                          disabled={!canChangePipeline || updatingPipeline === contact.id}
                          className="px-2 py-1 text-xs font-medium rounded-full transition-all hover:opacity-80"
                          style={{ 
                            backgroundColor: `${getStageColor(contact.pipelineStatus)}20`,
                            color: getStageColor(contact.pipelineStatus),
                            textShadow: `0 0 5px ${getStageColor(contact.pipelineStatus)}`,
                            cursor: canChangePipeline ? 'pointer' : 'default',
                            opacity: updatingPipeline === contact.id ? 0.5 : 1
                          }}
                        >
                          {updatingPipeline === contact.id ? 'Updating...' : getStageLabel(contact.pipelineStatus)}
                        </button>
                        {canChangePipeline && openPipelineDropdown === contact.id && (
                          <select
                            autoFocus
                            onChange={(e) => { handlePipelineChange(contact.id, e.target.value); setOpenPipelineDropdown(null); }}
                            value={contact.pipelineStatus}
                            className="absolute z-50 mt-1 w-48 rounded-lg border p-2"
                            style={{ 
                              backgroundColor: '#1a1a1a', 
                              borderColor: '#00f0ff',
                              color: '#f5f5f5',
                              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
                            }}
                          >
                            {PIPELINE_STAGES.map((stage) => (
                              <option key={stage.value} value={stage.value} style={{ color: '#f5f5f5' }}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#f5f5f5' }}>
                      {formatCurrency(contact.oneTimeDealValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#f5f5f5' }}>
                      {formatCurrency(contact.monthlyDealValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        contact.icpStatus === 'Hot' ? 'bg-red-900 text-red-400' :
                        contact.icpStatus === 'Warm' ? 'bg-yellow-900 text-yellow-400' :
                        contact.icpStatus === 'Cold' ? 'bg-blue-900 text-blue-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {contact.icpStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => canChangeStatus ? setOpenStatusDropdown(openStatusDropdown === contact.id ? null : contact.id) : null}
                          disabled={!canChangeStatus || updatingStatus === contact.id}
                          className="px-2 py-1 text-xs font-medium rounded-full transition-all hover:opacity-80"
                          style={{ 
                            backgroundColor: contact.contactStatus === 'New' ? 'rgba(59, 130, 246, 0.2)' :
                            contact.contactStatus === 'Contacted' ? 'rgba(234, 179, 8, 0.2)' :
                            contact.contactStatus === 'Qualified' ? 'rgba(168, 85, 247, 0.2)' :
                            contact.contactStatus === 'Converted' ? 'rgba(34, 197, 94, 0.2)' :
                            'rgba(239, 68, 68, 0.2)',
                            color: contact.contactStatus === 'New' ? '#3b82f6' :
                            contact.contactStatus === 'Contacted' ? '#eab308' :
                            contact.contactStatus === 'Qualified' ? '#a855f7' :
                            contact.contactStatus === 'Converted' ? '#22c55e' :
                            '#ef4444',
                            cursor: canChangeStatus ? 'pointer' : 'default',
                            opacity: updatingStatus === contact.id ? 0.5 : 1
                          }}
                        >
                          {updatingStatus === contact.id ? 'Updating...' : contact.contactStatus}
                        </button>
                        {canChangeStatus && openStatusDropdown === contact.id && (
                          <select
                            autoFocus
                            onChange={(e) => { handleStatusChange(contact.id, e.target.value); setOpenStatusDropdown(null); }}
                            value={contact.contactStatus}
                            className="absolute z-50 mt-1 w-36 rounded-lg border p-2"
                            style={{ 
                              backgroundColor: '#1a1a1a', 
                              borderColor: '#00f0ff',
                              color: '#f5f5f5',
                              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
                            }}
                          >
                            {['New', 'Contacted', 'Qualified', 'Converted', 'Lost'].map((status) => (
                              <option key={status} value={status} style={{ color: '#f5f5f5' }}>
                                {status}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.demoLinks ? (
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            try {
                              const links = JSON.parse(contact.demoLinks)
                              return links.map((link: {title: string, link: string}, idx: number) => (
                                <a
                                  key={idx}
                                  href={link.link.startsWith('http') ? link.link : `https://${link.link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 rounded-full hover:opacity-80"
                                  style={{ 
                                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                    color: '#a855f7',
                                    border: '1px solid rgba(139, 92, 246, 0.5)'
                                  }}
                                  title={link.title}
                                >
                                  {link.title}
                                </a>
                              ))
                            } catch {
                              return null
                            }
                          })()}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteContact(contact.id, contact.firstName, contact.lastName)}
                          className="p-1 rounded transition-colors hover:bg-red-900"
                          style={{ color: '#ef4444' }}
                          title="Delete contact"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddContactModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        environment={env}
        onSaved={() => fetchContacts()}
      />
      <ImportLeadsModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        environment={env}
        onImported={() => fetchContacts()}
      />
    </div>
  )
}

// ImportLeadsModal Component
function ImportLeadsModal({ show, onClose, environment, onImported }: {
  show: boolean
  onClose: () => void
  environment: string
  onImported: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: any[] } | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [pipelineStatus, setPipelineStatus] = useState('not_yet_called')
  const [contactStatus, setContactStatus] = useState('New')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  const CRM_FIELDS = [
    { value: '', label: '-- Select Field --' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'company', label: 'Company' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'title', label: 'Title' },
    { value: 'website', label: 'Website' },
    { value: 'address', label: 'Address' },
    { value: 'state', label: 'State' },
    { value: 'country', label: 'Country' },
    { value: 'timezone', label: 'Timezone' },
    { value: 'linkedinUrl', label: 'LinkedIn URL' },
  ]

  // Reset state when modal opens
  useEffect(() => {
    if (!show) {
      setFile(null)
      setParsedData(null)
      setColumnMapping({})
      setPipelineStatus('not_yet_called')
      setContactStatus('New')
      setImportResult(null)
    }
  }, [show])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportResult(null)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

      if (!jsonData || jsonData.length === 0) {
        setImportResult({ success: false, message: 'File is empty' })
        return
      }

      const headers = jsonData[0].map((h: any) => String(h).trim())
      const rows = jsonData.slice(1, 6) // Preview first 5 data rows

      setParsedData({ headers, rows })

      // Auto-map columns based on header names
      const autoMapping: Record<string, string> = {}
      headers.forEach((header) => {
        const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (headerLower.includes('first') && headerLower.includes('name')) {
          autoMapping[header] = 'firstName'
        } else if (headerLower.includes('last') && headerLower.includes('name')) {
          autoMapping[header] = 'lastName'
        } else if (headerLower === 'name' || headerLower === 'fullname') {
          autoMapping[header] = 'firstName'
        } else if (headerLower.includes('company') || headerLower.includes('organization') || headerLower.includes('business')) {
          autoMapping[header] = 'company'
        } else if (headerLower.includes('email') || headerLower.includes('e-mail')) {
          autoMapping[header] = 'email'
        } else if (headerLower.includes('phone') || headerLower.includes('tel') || headerLower.includes('mobile')) {
          autoMapping[header] = 'phone'
        } else if (headerLower.includes('title') || headerLower.includes('position') || headerLower.includes('job')) {
          autoMapping[header] = 'title'
        } else if (headerLower.includes('website') || headerLower.includes('url') || headerLower.includes('web')) {
          autoMapping[header] = 'website'
        } else if (headerLower.includes('address') || headerLower.includes('street')) {
          autoMapping[header] = 'address'
        } else if (headerLower.includes('state') || headerLower.includes('province')) {
          autoMapping[header] = 'state'
        } else if (headerLower.includes('country') || headerLower.includes('nation')) {
          autoMapping[header] = 'country'
        } else if (headerLower.includes('timezone') || headerLower.includes('tz')) {
          autoMapping[header] = 'timezone'
        } else if (headerLower.includes('linkedin') || headerLower.includes('linked')) {
          autoMapping[header] = 'linkedinUrl'
        }
      })
      setColumnMapping(autoMapping)
    } catch (error) {
      console.error('Error parsing file:', error)
      setImportResult({ success: false, message: 'Error parsing file. Please ensure it is a valid CSV/XLSX file.' })
    }
  }

  function handleMappingChange(header: string, value: string) {
    setColumnMapping(prev => ({ ...prev, [header]: value }))
  }

  async function handleImport() {
    if (!parsedData || parsedData.rows.length === 0) return

    setImporting(true)
    setImportResult(null)

    try {
      // Re-parse full file to get all rows
      const fullData = await file?.arrayBuffer()
      const workbook = XLSX.read(fullData, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

      const allRows = jsonData.slice(1)

      // Map each row based on column mapping
      const contacts = allRows.map((row: any[]) => {
        const contact: any = {}
        parsedData.headers.forEach((header, index) => {
          const crmField = columnMapping[header]
          if (crmField && row[index] !== undefined && row[index] !== null && row[index] !== '') {
            contact[crmField] = String(row[index])
          }
        })
        // Apply batch-level pipeline and contact status
        contact.pipelineStatus = pipelineStatus
        contact.contactStatus = contactStatus
        return contact
      })

      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, environment }),
      })

      const result = await res.json()

      if (res.ok) {
        setImportResult({ success: true, message: `Successfully imported ${result.createdCount} contacts!` })
        setTimeout(() => {
          onImported()
          onClose()
        }, 1500)
      } else {
        setImportResult({ success: false, message: result.error || 'Import failed' })
      }
    } catch (error) {
      console.error('Error importing contacts:', error)
      setImportResult({ success: false, message: 'Error importing contacts' })
    } finally {
      setImporting(false)
    }
  }

  if (!show) return null

  const inputStyle = {
    backgroundColor: '#222222',
    border: '1px solid #2a2a2a',
    color: '#f5f5f5',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: '0.25rem',
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 border" style={{ backgroundColor: '#1a1a1a', borderColor: '#a855f7', boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)' }}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
          <h2 className="text-xl font-semibold" style={{ color: '#a855f7', textShadow: '0 0 10px #a855f7' }}>Import Leads</h2>
          <button onClick={onClose} className="hover:underline" style={{ color: '#6b7280' }}>✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label style={labelStyle}>Upload CSV or XLSX File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-3 py-2 rounded-lg"
              style={{ 
                backgroundColor: '#222222', 
                border: '1px solid #2a2a2a',
                color: '#f5f5f5'
              }}
            />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Supported formats: CSV, XLSX</p>
          </div>

          {/* Column Mapping */}
          {parsedData && (
            <div>
              <label style={labelStyle}>Map Columns</label>
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#2a2a2a' }}>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="min-w-full">
                    <thead style={{ backgroundColor: '#222222' }}>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6b7280' }}>CSV Column</th>
                        <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6b7280' }}>CRM Field</th>
                        <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: '#6b7280' }}>Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.headers.map((header) => (
                        <tr key={header} className="border-t" style={{ borderColor: '#2a2a2a' }}>
                          <td className="px-4 py-2 text-sm" style={{ color: '#f5f5f5' }}>{header}</td>
                          <td className="px-4 py-2">
                            <select
                              value={columnMapping[header] || ''}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                              style={{ ...selectStyle, width: '180px' }}
                            >
                              {CRM_FIELDS.map(field => (
                                <option key={field.value} value={field.value} style={{ color: '#f5f5f5' }}>
                                  {field.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-sm" style={{ color: '#9ca3af' }}>
                            {parsedData.rows[0]?.[parsedData.headers.indexOf(header)] || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Batch Settings */}
          {parsedData && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Pipeline Status (Applies to All)</label>
                <select
                  value={pipelineStatus}
                  onChange={(e) => setPipelineStatus(e.target.value)}
                  style={selectStyle}
                >
                  {PIPELINE_STAGES.map(stage => (
                    <option key={stage.value} value={stage.value} style={{ color: '#f5f5f5' }}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Contact Status (Applies to All)</label>
                <select
                  value={contactStatus}
                  onChange={(e) => setContactStatus(e.target.value)}
                  style={selectStyle}
                >
                  <option value="New" style={{ color: '#f5f5f5' }}>New</option>
                  <option value="Contacted" style={{ color: '#f5f5f5' }}>Contacted</option>
                  <option value="Qualified" style={{ color: '#f5f5f5' }}>Qualified</option>
                  <option value="Converted" style={{ color: '#f5f5f5' }}>Converted</option>
                  <option value="Lost" style={{ color: '#f5f5f5' }}>Lost</option>
                </select>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div 
              className={`p-4 rounded-lg text-center font-medium ${
                importResult.success ? '' : ''
              }`}
              style={{ 
                backgroundColor: importResult.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${importResult.success ? '#22c55e' : '#ef4444'}`,
                color: importResult.success ? '#22c55e' : '#ef4444',
              }}
            >
              {importResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'transparent', 
                border: '1px solid #2a2a2a',
                color: '#9ca3af'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!parsedData || importing}
              className="px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'rgba(168, 85, 247, 0.15)', 
                color: '#a855f7',
                border: '1px solid #a855f7',
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.3)'
              }}
            >
              {importing ? 'Importing...' : 'Import Leads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddContactModal({ show, onClose, environment, onSaved }: { 
  show: boolean
  onClose: () => void
  environment: string
  onSaved: () => void
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    linkedinUrl: '',
    address: '',
    state: '',
    country: '',
    timezone: '',
    icpStatus: 'Cold',
    serviceQualifier: '',
    phoneType: 'Unknown',
    contactStatus: 'New',
    interestStatus: 'Not Yet Asked',
    smsOptIn: 'Pending',
    oneTimeDealValue: 0,
    monthlyDealValue: 0,
    pipelineStatus: 'not_yet_called',
    assetLink: '',
    assetNotes: '',
    callComments: '',
    followUpNote: '',
    leadNotes: '',
    outreachHistory: '',
    demoLinks: '',
    environment: environment,
  })
  const [demoLinks, setDemoLinks] = useState<{title: string, link: string}[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Serialize demo links to JSON string
    const dataToSubmit = {
      ...formData,
      demoLinks: demoLinks.length > 0 ? JSON.stringify(demoLinks) : '',
    }
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      })
      onSaved()
      onClose()
      setFormData({
        firstName: '',
        lastName: '',
        title: '',
        company: '',
        email: '',
        phone: '',
        website: '',
        linkedinUrl: '',
        address: '',
        state: '',
        country: '',
        timezone: '',
        icpStatus: 'Cold',
        serviceQualifier: '',
        phoneType: 'Unknown',
        contactStatus: 'New',
        interestStatus: 'Not Yet Asked',
        smsOptIn: 'Pending',
        oneTimeDealValue: 0,
        monthlyDealValue: 0,
        pipelineStatus: 'not_yet_called',
        assetLink: '',
        assetNotes: '',
        callComments: '',
        followUpNote: '',
        leadNotes: '',
        outreachHistory: '',
        demoLinks: '',
        environment: environment,
      })
      setDemoLinks([])
    } catch (error) {
      console.error('Error creating contact:', error)
    }
  }

  function addDemoLink() {
    setDemoLinks([...demoLinks, { title: '', link: '' }])
  }

  function removeDemoLink(index: number) {
    setDemoLinks(demoLinks.filter((_, i) => i !== index))
  }

  function updateDemoLink(index: number, field: 'title' | 'link', value: string) {
    const newLinks = [...demoLinks]
    newLinks[index][field] = value
    setDemoLinks(newLinks)
  }

  if (!show) return null

  const inputStyle = {
    backgroundColor: '#222222',
    border: '1px solid #2a2a2a',
    color: '#f5f5f5',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: '0.25rem',
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border" style={{ backgroundColor: '#1a1a1a', borderColor: '#00f0ff', boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)' }}>
        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: '#2a2a2a' }}>
          <h2 className="text-xl font-semibold" style={{ color: '#00f0ff', textShadow: '0 0 10px #00f0ff' }}>Add Contact</h2>
          <button onClick={onClose} className="hover:underline" style={{ color: '#6b7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                style={inputStyle}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>ICP Status</label>
              <select
                value={formData.icpStatus}
                onChange={(e) => setFormData({ ...formData, icpStatus: e.target.value })}
                style={inputStyle}
              >
                <option value="Hot" style={{ color: '#f5f5f5' }}>Hot</option>
                <option value="Warm" style={{ color: '#f5f5f5' }}>Warm</option>
                <option value="Cold" style={{ color: '#f5f5f5' }}>Cold</option>
                <option value="Nurture" style={{ color: '#f5f5f5' }}>Nurture</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pipeline Status</label>
              <select
                value={formData.pipelineStatus}
                onChange={(e) => setFormData({ ...formData, pipelineStatus: e.target.value })}
                style={inputStyle}
              >
                {PIPELINE_STAGES.map(stage => (
                  <option key={stage.value} value={stage.value} style={{ color: '#f5f5f5' }}>{stage.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Contact Status</label>
              <select
                value={formData.contactStatus}
                onChange={(e) => setFormData({ ...formData, contactStatus: e.target.value })}
                style={inputStyle}
              >
                <option value="New" style={{ color: '#f5f5f5' }}>New</option>
                <option value="Contacted" style={{ color: '#f5f5f5' }}>Contacted</option>
                <option value="Qualified" style={{ color: '#f5f5f5' }}>Qualified</option>
                <option value="Converted" style={{ color: '#f5f5f5' }}>Converted</option>
                <option value="Lost" style={{ color: '#f5f5f5' }}>Lost</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Interest Status</label>
              <select
                value={formData.interestStatus}
                onChange={(e) => setFormData({ ...formData, interestStatus: e.target.value })}
                style={inputStyle}
              >
                <option value="Interested" style={{ color: '#f5f5f5' }}>Interested</option>
                <option value="Not Interested" style={{ color: '#f5f5f5' }}>Not Interested</option>
                <option value="Pending" style={{ color: '#f5f5f5' }}>Pending</option>
                <option value="Not Yet Asked" style={{ color: '#f5f5f5' }}>Not Yet Asked</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Phone Type</label>
              <select
                value={formData.phoneType}
                onChange={(e) => setFormData({ ...formData, phoneType: e.target.value })}
                style={inputStyle}
              >
                <option value="Mobile" style={{ color: '#f5f5f5' }}>Mobile</option>
                <option value="Landline" style={{ color: '#f5f5f5' }}>Landline</option>
                <option value="VoIP" style={{ color: '#f5f5f5' }}>VoIP</option>
                <option value="Unknown" style={{ color: '#f5f5f5' }}>Unknown</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>SMS Opt-In</label>
              <select
                value={formData.smsOptIn}
                onChange={(e) => setFormData({ ...formData, smsOptIn: e.target.value })}
                style={inputStyle}
              >
                <option value="Yes" style={{ color: '#f5f5f5' }}>Yes</option>
                <option value="No" style={{ color: '#f5f5f5' }}>No</option>
                <option value="Pending" style={{ color: '#f5f5f5' }}>Pending</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Service Qualifier</label>
              <select
                value={formData.serviceQualifier}
                onChange={(e) => setFormData({ ...formData, serviceQualifier: e.target.value })}
                style={inputStyle}
              >
                <option value="" style={{ color: '#f5f5f5' }}>Select...</option>
                <option value="Enterprise" style={{ color: '#f5f5f5' }}>Enterprise</option>
                <option value="SMB" style={{ color: '#f5f5f5' }}>SMB</option>
                <option value="Startup" style={{ color: '#f5f5f5' }}>Startup</option>
                <option value="Consumer" style={{ color: '#f5f5f5' }}>Consumer</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>One-Time Deal Value ($)</label>
              <input
                type="number"
                value={formData.oneTimeDealValue}
                onChange={(e) => setFormData({ ...formData, oneTimeDealValue: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Monthly Deal Value ($)</label>
              <input
                type="number"
                value={formData.monthlyDealValue}
                onChange={(e) => setFormData({ ...formData, monthlyDealValue: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              style={inputStyle}
            />
          </div>
          {/* Demo Links Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label style={labelStyle}>Demo Links</label>
              <button
                type="button"
                onClick={addDemoLink}
                className="text-xs px-2 py-1 rounded transition-all"
                style={{ 
                  backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                  color: '#a855f7',
                  border: '1px solid rgba(139, 92, 246, 0.5)'
                }}
              >
                + Add Demo Link
              </button>
            </div>
            {demoLinks.map((link, index) => (
              <div key={index} className="flex gap-2 mb-2 items-start">
                <input
                  type="text"
                  placeholder="Title (e.g., Product Demo)"
                  value={link.title}
                  onChange={(e) => updateDemoLink(index, 'title', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: '#f5f5f5'
                  }}
                />
                <input
                  type="url"
                  placeholder="https://demo.example.com"
                  value={link.link}
                  onChange={(e) => updateDemoLink(index, 'link', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg"
                  style={{ 
                    backgroundColor: '#222222', 
                    border: '1px solid #2a2a2a',
                    color: '#f5f5f5'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeDemoLink(index)}
                  className="p-2 rounded transition-colors hover:bg-red-900"
                  style={{ color: '#ef4444' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={formData.leadNotes}
              onChange={(e) => setFormData({ ...formData, leadNotes: e.target.value })}
              rows={3}
              style={inputStyle}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'transparent', 
                border: '1px solid #2a2a2a',
                color: '#9ca3af'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'rgba(0, 240, 255, 0.15)', 
                color: '#00f0ff',
                border: '1px solid #00f0ff',
                boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
              }}
            >
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: '#6b7280' }}>Loading...</div>}>
      <ContactsContent />
    </Suspense>
  )
}