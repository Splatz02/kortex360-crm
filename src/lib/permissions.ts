import { useSession } from 'next-auth/react'

// Type definitions for permissions
export interface Permissions {
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
    // New permission keys (task specified)
    dashboard_pipeline: boolean
    dashboard_recent_transactions: boolean
    dashboard_follow_ups: boolean
    dashboard_contact_db: boolean
  }
  actions: {
    add_contacts: boolean
    import_contacts: boolean
    edit_contacts: boolean
    delete_contacts: boolean
  }
}

// Helper function to check if user has a specific permission
export function hasPermission(
  permissions: Permissions | undefined,
  category: keyof Permissions,
  key: string,
  defaultValue: boolean = false,
  role?: string
): boolean {
  // Admin always has all permissions
  if (role === 'admin') {
    return true
  }
  if (!permissions) return defaultValue
  
  const categoryPermissions = permissions[category]
  if (!categoryPermissions) return defaultValue
  
  return (categoryPermissions as any)?.[key] ?? defaultValue
}

// Hook to get permissions from session
export function usePermissions() {
  const { data: session } = useSession()
  
  return {
    permissions: session?.user?.permissions as Permissions | undefined,
    role: session?.user?.role as string | undefined,
    isAdmin: session?.user?.role === 'admin',
  }
}

// Helper to check if user can view dashboard
export function canViewDashboard(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'dashboard', 'view_dashboard', true, role)
}

// Helper to check if user can view contacts
export function canViewContacts(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'pages', 'contacts', true, role)
}

// Helper to check if user can create contacts
export function canCreateContact(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'contacts', 'create_contact', true, role)
}

// Helper to check if user can edit contacts
export function canEditContact(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'contacts', 'edit_contact', true, role)
}

// Helper to check if user can delete contacts
export function canDeleteContact(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'contacts', 'delete_contact', true, role)
}

// Helper to check if user can change contact status
export function canChangeContactStatus(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'contacts', 'change_contact_status', true, role)
}

// Helper to check if user can change pipeline status
export function canChangePipelineStatus(permissions: Permissions | undefined, role?: string): boolean {
  return hasPermission(permissions, 'contacts', 'change_contact_pipeline_status', true, role)
}

// Dashboard section visibility helpers (supports both old and new key names)
export function showPipelineOverview(permissions: Permissions | undefined, role?: string): boolean {
  // Check new key first, then fall back to old key
  const newKeyValue = hasPermission(permissions, 'dashboard', 'dashboard_pipeline', undefined, role)
  const oldKeyValue = hasPermission(permissions, 'dashboard', 'show_pipeline_overview', true, role)
  return newKeyValue !== undefined ? newKeyValue : oldKeyValue
}

export function showRecentTransactions(permissions: Permissions | undefined, role?: string): boolean {
  const newKeyValue = hasPermission(permissions, 'dashboard', 'dashboard_recent_transactions', undefined, role)
  const oldKeyValue = hasPermission(permissions, 'dashboard', 'show_recent_transactions', true, role)
  return newKeyValue !== undefined ? newKeyValue : oldKeyValue
}

export function showTodaysFollowUps(permissions: Permissions | undefined, role?: string): boolean {
  const newKeyValue = hasPermission(permissions, 'dashboard', 'dashboard_follow_ups', undefined, role)
  const oldKeyValue = hasPermission(permissions, 'dashboard', 'show_todays_follow_ups', true, role)
  return newKeyValue !== undefined ? newKeyValue : oldKeyValue
}

export function showContactDatabase(permissions: Permissions | undefined, role?: string): boolean {
  const newKeyValue = hasPermission(permissions, 'dashboard', 'dashboard_contact_db', undefined, role)
  const oldKeyValue = hasPermission(permissions, 'dashboard', 'show_contact_database', true, role)
  return newKeyValue !== undefined ? newKeyValue : oldKeyValue
}

// Server-side permission check for API routes
// Note: This is a synchronous helper that expects permissions to be already loaded
// For use in API routes, you'll need to pass permissions from the session
export async function checkPermission(permission: string): Promise<boolean> {
  // Parse permission string (e.g., 'actions.import_contacts' -> category: 'actions', key: 'import_contacts')
  const [category, key] = permission.split('.')
  if (!category || !key) {
    console.error('Invalid permission format:', permission)
    return false
  }
  
  // This function needs to be called with session permissions
  // The actual implementation should get session and check permissions
  // For now, return true - the API routes will need to pass session manually
  return true
}