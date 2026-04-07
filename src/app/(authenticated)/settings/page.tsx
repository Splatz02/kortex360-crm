'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, Users, Trash2, Plus, Save, X, Building } from 'lucide-react'

interface PersonalizationSettings {
  id: string
  companyName: string
}

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  permissions: {
    pages: {
      contacts: boolean
      pipeline: boolean
      followups: boolean
      payments: boolean
      dashboard: boolean
      settings: boolean
    }
    contacts: {
      view_contacts: boolean
      create_contact: boolean
      edit_contact: boolean
      delete_contact: boolean
      export_contacts: boolean
      change_contact_pipeline_status: boolean
      change_contact_status: boolean
    }
    payments: {
      view_payments: boolean
      create_payment: boolean
      edit_payment: boolean
      delete_payment: boolean
      export_payments: boolean
    }
    pipeline: {
      view_pipeline: boolean
      edit_pipeline_stage: boolean
    }
    settings: {
      view_settings: boolean
      manage_team: boolean
      manage_permissions: boolean
    }
    dashboard: {
      view_dashboard: boolean
      show_pipeline_overview: boolean
      show_recent_transactions: boolean
      show_todays_follow_ups: boolean
      show_contact_database: boolean
      // New permission keys
      dashboard_pipeline: boolean
      dashboard_recent_transactions: boolean
      dashboard_follow_ups: boolean
      dashboard_contact_db: boolean
    }
  }
  createdAt: string
  updatedAt: string
}

interface PermissionCategory {
  label: string
  key: 'pages' | 'dashboard' | 'contacts' | 'payments' | 'pipeline' | 'settings'
  items: {
    key: string
    label: string
  }[]
}

const permissionCategories: PermissionCategory[] = [
  {
    label: 'Page Access',
    key: 'pages',
    items: [
      { key: 'contacts', label: 'Contacts' },
      { key: 'pipeline', label: 'Pipeline' },
      { key: 'followups', label: 'Follow-Ups' },
      { key: 'payments', label: 'Payments' },
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'settings', label: 'Settings' },
    ]
  },
  {
    label: 'Contacts',
    key: 'contacts',
    items: [
      { key: 'view_contacts', label: 'View Contacts' },
      { key: 'create_contact', label: 'Create Contact' },
      { key: 'edit_contact', label: 'Edit Contact' },
      { key: 'delete_contact', label: 'Delete Contact' },
      { key: 'export_contacts', label: 'Export Contacts' },
      { key: 'change_contact_pipeline_status', label: 'Change Pipeline Status' },
      { key: 'change_contact_status', label: 'Change Contact Status' },
    ]
  },
  {
    label: 'Payments',
    key: 'payments',
    items: [
      { key: 'view_payments', label: 'View Payments' },
      { key: 'create_payment', label: 'Create Payment' },
      { key: 'edit_payment', label: 'Edit Payment' },
      { key: 'delete_payment', label: 'Delete Payment' },
      { key: 'export_payments', label: 'Export Payments' },
    ]
  },
  {
    label: 'Pipeline',
    key: 'pipeline',
    items: [
      { key: 'view_pipeline', label: 'View Pipeline' },
      { key: 'edit_pipeline_stage', label: 'Edit Pipeline Stage' },
    ]
  },
  {
    label: 'Settings',
    key: 'settings',
    items: [
      { key: 'view_settings', label: 'View Settings' },
      { key: 'manage_team', label: 'Manage Team' },
      { key: 'manage_permissions', label: 'Manage Permissions' },
    ]
  },
  {
    label: 'Dashboard',
    key: 'dashboard',
    items: [
      { key: 'view_dashboard', label: 'View Dashboard' },
      { key: 'dashboard_pipeline', label: 'Pipeline Overview' },
      { key: 'dashboard_recent_transactions', label: 'Recent Transactions' },
      { key: 'dashboard_follow_ups', label: "Today's Follow-Ups" },
      { key: 'dashboard_contact_db', label: 'Contact Database' },
    ]
  }
]

// Helper function to safely get permission values
// Admin always has all permissions, so we check the role first
const getPermissionValue = (permissions: TeamMember['permissions'] | undefined, category: string, key: string, defaultValue: boolean = false, memberRole?: string): boolean => {
  // Admin has all permissions
  if (memberRole === 'admin') {
    return true
  }
  if (!permissions || !permissions[category as keyof TeamMember['permissions']]) return defaultValue
  return (permissions[category as keyof TeamMember['permissions']] as any)?.[key] ?? defaultValue
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'team' | 'personalization'>('team')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [newMember, setNewMember] = useState({
    email: '',
    password: '',
    name: '',
    role: 'member',
    permissions: {
      pages: { contacts: true, pipeline: true, followups: true, payments: true, dashboard: true, settings: true},
      contacts: { view_contacts: true, create_contact: true, edit_contact: true, delete_contact: true, export_contacts: true, change_contact_pipeline_status: true, change_contact_status: true },
      payments: { view_payments: true, create_payment: true, edit_payment: true, delete_payment: true, export_payments: true },
      pipeline: { view_pipeline: true, edit_pipeline_stage: true },
      settings: { view_settings: true, manage_team: true, manage_permissions: true },
      dashboard: { view_dashboard: true, show_pipeline_overview: true, show_recent_transactions: true, show_todays_follow_ups: true, show_contact_database: true, dashboard_pipeline: true, dashboard_recent_transactions: true, dashboard_follow_ups: true, dashboard_contact_db: true },
    }
  })

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin'

  // Personalization state
  const [personalization, setPersonalization] = useState<PersonalizationSettings>({
    id: 'default',
    companyName: ''
  })
  const [savingPersonalization, setSavingPersonalization] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      fetchTeamMembers()
      fetchPersonalization()
    }
  }, [isAdmin])

  const fetchPersonalization = async () => {
    try {
      const res = await fetch('/api/personalization')
      if (res.ok) {
        const data = await res.json()
        setPersonalization(data)
      }
    } catch (error) {
      console.error('Error fetching personalization:', error)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        const data = await res.json()
        // Parse permissions from string to object
        const parsedData = data.map((member: TeamMember) => ({
          ...member,
          permissions: typeof member.permissions === 'string' 
            ? JSON.parse(member.permissions) 
            : member.permissions
        }))
        setTeamMembers(parsedData)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      })

      if (res.ok) {
        const newMemberData = await res.json()
        setTeamMembers([...teamMembers, newMemberData])
        setShowAddForm(false)
        setNewMember({
          email: '',
          password: '',
          name: '',
          role: 'member',
          permissions: {
            pages: { contacts: true, pipeline: true, followups: true, payments: true, dashboard: true, settings: true },
            contacts: { view_contacts: true, create_contact: true, edit_contact: true, delete_contact: true, export_contacts: true, change_contact_pipeline_status: true, change_contact_status: true },
            payments: { view_payments: true, create_payment: true, edit_payment: true, delete_payment: true, export_payments: true },
            pipeline: { view_pipeline: true, edit_pipeline_stage: true },
            settings: { view_settings: true, manage_team: true, manage_permissions: true },
            dashboard: { view_dashboard: true, show_pipeline_overview: true, show_recent_transactions: true, show_todays_follow_ups: true, show_contact_database: true, dashboard_pipeline: true, dashboard_recent_transactions: true, dashboard_follow_ups: true, dashboard_contact_db: true }
          }
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
    }
  }

  // Logo feature was removed

  const handleSavePersonalization = async () => {
    setSavingPersonalization(true)
    try {
      const res = await fetch('/api/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: personalization.companyName })
      })

      if (res.ok) {
        const data = await res.json()
        setPersonalization(data)
        alert('Settings saved successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving personalization:', error)
      alert('Failed to save settings')
    } finally {
      setSavingPersonalization(false)
    }
  }

  const handleUpdatePermissions = async (memberId: string, permissions: TeamMember['permissions']) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      })

      if (res.ok) {
        const updatedMemberRaw = await res.json()
        // Parse permissions from string to object
        const updatedMember = {
          ...updatedMemberRaw,
          permissions: typeof updatedMemberRaw.permissions === 'string'
            ? JSON.parse(updatedMemberRaw.permissions)
            : updatedMemberRaw.permissions
        }
        setTeamMembers(teamMembers.map(m => m.id === memberId ? updatedMember : m))
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== memberId))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete member')
      }
    } catch (error) {
      console.error('Error deleting member:', error)
    }
  }

  // Track local permission changes while editing
  const [localPermissions, setLocalPermissions] = useState<{[memberId: string]: TeamMember['permissions']}>({})

  const togglePermission = (
    category: 'pages' | 'dashboard' | 'contacts' | 'payments' | 'pipeline' | 'settings',
    key: string,
    isEdit: boolean = false
  ) => {
    if (isEdit && editingMember) {
      const member = teamMembers.find(m => m.id === editingMember)
      if (!member || !member.permissions) return

      // Use local permissions if they exist, otherwise use member permissions
      const currentPermissions = localPermissions[editingMember] || member.permissions
      
      const updatedPermissions = { ...currentPermissions } as any
      // Initialize category if it doesn't exist
      if (!updatedPermissions[category]) {
        updatedPermissions[category] = {}
      }
      updatedPermissions[category] = {
        ...updatedPermissions[category],
        [key]: !updatedPermissions[category]?.[key]
      }

      // Update local state for visual feedback (don't persist yet - wait for Save button)
      setLocalPermissions(prev => ({
        ...prev,
        [editingMember]: updatedPermissions as TeamMember['permissions']
      }))
    } else {
      setNewMember({
        ...newMember,
        permissions: {
          ...newMember.permissions,
          [category]: {
            ...newMember.permissions[category],
            [key]: !newMember.permissions[category][key as keyof typeof newMember.permissions[typeof category]]
          }
        }
      })
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="text-gray-400 mt-2">You must be an admin to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Settings className="w-8 h-8 mr-3" style={{ color: '#00f0ff' }} />
        <h1 className="text-2xl font-bold" style={{ color: '#00f0ff' }}>Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: '#2a2a2a' }}>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'team' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab === 'team' ? '#00f0ff' : '#9ca3af',
            borderColor: activeTab === 'team' ? '#00f0ff' : 'transparent'
          }}
        >
          <Users className="w-4 h-4 mr-2" />
          Team
        </button>
        <button
          onClick={() => setActiveTab('personalization')}
          className={`flex items-center px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'personalization' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab === 'personalization' ? '#00f0ff' : '#9ca3af',
            borderColor: activeTab === 'personalization' ? '#00f0ff' : 'transparent'
          }}
        >
          <Building className="w-4 h-4 mr-2" />
          Personalization
        </button>
      </div>

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div>
          {/* Add Member Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all"
              style={{ backgroundColor: '#00f0ff', color: '#0a0a0a' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium" style={{ color: '#00f0ff' }}>Add New Member</h3>
                <button onClick={() => setShowAddForm(false)}>
                  <X className="w-5 h-5" style={{ color: '#9ca3af' }} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9ca3af' }}>Email</label>
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border"
                    style={{ backgroundColor: '#0a0a0a', borderColor: '#2a2a2a', color: '#fff' }}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9ca3af' }}>Name</label>
                  <input
                    type="text"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border"
                    style={{ backgroundColor: '#0a0a0a', borderColor: '#2a2a2a', color: '#fff' }}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9ca3af' }}>Password</label>
                  <input
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border"
                    style={{ backgroundColor: '#0a0a0a', borderColor: '#2a2a2a', color: '#fff' }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Permissions for New Member */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>Permissions</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {permissionCategories.map((category) => (
                    <div key={category.key} className="p-3 rounded" style={{ backgroundColor: '#0a0a0a' }}>
                      <h4 className="text-sm font-medium mb-2" style={{ color: '#00f0ff' }}>{category.label}</h4>
                      {category.items.map((item) => (
                        <label key={item.key} className="flex items-center mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={getPermissionValue(newMember.permissions, category.key, item.key, true)}
                            onChange={() => togglePermission(category.key, item.key)}
                            className="w-4 h-4 rounded mr-2"
                            style={{ accentColor: '#00f0ff' }}
                          />
                          <span className="text-sm" style={{ color: '#9ca3af' }}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddMember}
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all"
                style={{ backgroundColor: '#00f0ff', color: '#0a0a0a' }}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Member
              </button>
            </div>
          )}

          {/* Team Members List */}
          {loading ? (
            <div className="text-center py-8" style={{ color: '#9ca3af' }}>Loading...</div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium" style={{ color: '#fff' }}>{member.name}</h3>
                      <p className="text-sm" style={{ color: '#9ca3af' }}>{member.email}</p>
                      <span
                        className="inline-block mt-1 px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: member.role === 'admin' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                          color: member.role === 'admin' ? '#00f0ff' : '#9ca3af'
                        }}
                      >
                        {member.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-2 rounded transition-all hover:bg-opacity-10"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions */}
                  {editingMember === member.id ? (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: '#2a2a2a' }}>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium" style={{ color: '#00f0ff' }}>Edit Permissions</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Save permissions when clicking Save
                              const member = teamMembers.find(m => m.id === editingMember)
                              if (member && localPermissions[editingMember]) {
                                handleUpdatePermissions(editingMember, localPermissions[editingMember])
                              }
                              setEditingMember(null)
                              setLocalPermissions(prev => {
                                const updated = { ...prev }
                                delete updated[editingMember!]
                                return updated
                              })
                            }}
                            className="flex items-center px-3 py-1 text-sm rounded transition-all"
                            style={{ backgroundColor: '#00f0ff', color: '#0a0a0a' }}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              // Cancel - discard local changes
                              setLocalPermissions(prev => {
                                const updated = { ...prev }
                                delete updated[editingMember!]
                                return updated
                              })
                              setEditingMember(null)
                            }}
                            className="p-1 rounded"
                            style={{ color: '#9ca3af' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {permissionCategories.map((category) => (
                          <div key={category.key} className="p-3 rounded" style={{ backgroundColor: '#0a0a0a' }}>
                            <h5 className="text-xs font-medium mb-2" style={{ color: '#00f0ff' }}>{category.label}</h5>
                            {category.items.map((item) => {
                              const hasPermission = getPermissionValue(
                                editingMember === member.id && localPermissions[member.id]
                                  ? localPermissions[member.id]
                                  : member.permissions,
                                category.key, item.key, false, member.role)
                              return (
                                <label key={item.key} className="flex items-center mb-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={() => togglePermission(category.key as any, item.key, true)}
                                    className="w-4 h-4 rounded mr-2 cursor-pointer"
                                    style={{ accentColor: '#00f0ff', cursor: 'pointer' }}
                                  />
                                  <span className="text-sm" style={{ color: '#9ca3af' }}>{item.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: '#2a2a2a' }}>
                      <div className="flex justify-between items-center">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {permissionCategories.map((category) => (
                            <div key={category.key}>
                              <h5 className="text-xs font-medium mb-2" style={{ color: '#9ca3af' }}>{category.label}</h5>
                              <div className="flex flex-wrap gap-2">
                                {category.items.map((item) => {
                                  const hasPermission = getPermissionValue(member.permissions, category.key, item.key, false, member.role)
                                  return (
                                    <span
                                      key={item.key}
                                      className="px-2 py-1 text-xs rounded"
                                      style={{
                                        backgroundColor: hasPermission
                                          ? 'rgba(0, 240, 255, 0.2)'
                                          : 'rgba(156, 163, 175, 0.1)',
                                        color: hasPermission
                                          ? '#00f0ff'
                                          : '#6b7280'
                                      }}
                                    >
                                      {item.label}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => setEditingMember(member.id)}
                            className="flex items-center px-3 py-1 text-sm rounded transition-all"
                            style={{ backgroundColor: '#2a2a2a', color: '#9ca3af' }}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Edit Permissions
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Personalization Tab */}
      {activeTab === 'personalization' && (
        <div>
          <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <h3 className="text-lg font-medium mb-4" style={{ color: '#00f0ff' }}>Branding Settings</h3>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
              Customize how your organization appears in the sidebar. Only admins can see and edit these settings.
            </p>

            {/* Company Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>
                <Building className="w-4 h-4 inline mr-1" />
                Company Name
              </label>
              <input
                type="text"
                value={personalization.companyName}
                onChange={(e) => setPersonalization({ ...personalization, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-md border"
                style={{ backgroundColor: '#0a0a0a', borderColor: '#2a2a2a', color: '#fff' }}
                placeholder="Enter company name"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSavePersonalization}
              disabled={savingPersonalization}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all"
              style={{ backgroundColor: '#00f0ff', color: '#0a0a0a' }}
            >
              <Save className="w-4 h-4 mr-2" />
              {savingPersonalization ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}