'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, Users, Kanban, Calendar, DollarSign, LogOut, Settings } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { usePermissions, canViewDashboard, canViewContacts } from '@/lib/permissions'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
  { name: 'Contacts', href: '/contacts', icon: Users, permissionKey: 'contacts' },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban, permissionKey: 'pipeline' },
  { name: 'Follow-Ups', href: '/followups', icon: Calendar, permissionKey: 'followups' },
  { name: 'Payments', href: '/payments', icon: DollarSign, permissionKey: 'payments' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { permissions, role, isAdmin } = usePermissions()
  const [personalization, setPersonalization] = useState<{
    companyName: string
  }>({
    companyName: ''
  })

  // Check page access permissions
  const canAccessDashboard = canViewDashboard(permissions, role)
  const canAccessContacts = canViewContacts(permissions, role)
  const canAccessPipeline = permissions?.pages?.pipeline !== false
  const canAccessFollowups = permissions?.pages?.followups !== false
  const canAccessPayments = permissions?.pages?.payments !== false

  // Redirect if dashboard access is denied
  useEffect(() => {
    if (!canAccessDashboard && pathname === '/') {
      // Redirect to contacts if dashboard is not allowed
      router.push('/contacts')
    }
  }, [canAccessDashboard, pathname, router])

  // Fetch personalization settings
  useEffect(() => {
    const fetchPersonalization = async () => {
      try {
        const res = await fetch('/api/personalization/public')
        if (res.ok) {
          const data = await res.json()
          setPersonalization(data)
        }
      } catch (error) {
        console.error('Error fetching personalization:', error)
      }
    }
    fetchPersonalization()
  }, [])

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    switch (item.permissionKey) {
      case 'dashboard':
        return canAccessDashboard
      case 'contacts':
        return canAccessContacts
      case 'pipeline':
        return canAccessPipeline
      case 'followups':
        return canAccessFollowups
      case 'payments':
        return canAccessPayments
      default:
        return true
    }
  })

  return (
    <div className="flex h-screen sidebar" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="flex items-center h-16 px-4 sticky top-0 border-b" style={{ borderColor: '#2a2a2a', backgroundColor: '#0a0a0a' }}>
          <span className="text-xl font-bold" style={{ color: '#00f0ff', textShadow: '0 0 10px #00f0ff' }}>
            {personalization.companyName || 'Kortex CRM'}
          </span>
        </div>
        
        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all`}
                style={{
                  backgroundColor: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  color: isActive ? '#00f0ff' : '#9ca3af',
                  borderColor: isActive ? '#00f0ff' : 'transparent',
                  borderWidth: isActive ? '1px' : '0',
                  borderStyle: 'solid',
                  boxShadow: isActive ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
                }}
              >
                <Icon className="w-5 h-5 mr-3" style={{ color: isActive ? '#00f0ff' : '#9ca3af' }} />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        {/* Settings Link - Only for admin */}
        {isAdmin && (
          <div className="px-2 py-2 border-t" style={{ borderColor: '#2a2a2a' }}>
            <Link
              href="/settings"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all`}
              style={{
                backgroundColor: pathname === '/settings' ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                color: pathname === '/settings' ? '#00f0ff' : '#9ca3af',
                borderColor: pathname === '/settings' ? '#00f0ff' : 'transparent',
                borderWidth: pathname === '/settings' ? '1px' : '0',
                borderStyle: 'solid',
              }}
            >
              <Settings className="w-5 h-5 mr-3" style={{ color: pathname === '/settings' ? '#00f0ff' : '#9ca3af' }} />
              Settings
            </Link>
          </div>
        )}
        
        {/* Logout button */}
        <div className="px-2 py-4 border-t" style={{ borderColor: '#2a2a2a' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-opacity-10"
            style={{ color: '#9ca3af' }}
          >
            <LogOut className="w-5 h-5 mr-3" style={{ color: '#9ca3af' }} />
            Sign Out
          </button>
        </div>

        {/* Neon accent line at bottom */}
        <div className="h-1" style={{ 
          background: 'linear-gradient(90deg, #00f0ff, #39ff14, #ff00ff, #a855f7)',
          boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
        }} />
      </div>
    </div>
  )
}