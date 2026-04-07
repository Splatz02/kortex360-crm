'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, Users, Kanban, Calendar, DollarSign, Settings, X, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/lib/permissions'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
  { name: 'Contacts', href: '/contacts', icon: Users, permissionKey: 'contacts' },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban, permissionKey: 'pipeline' },
  { name: 'Follow-Ups', href: '/followups', icon: Calendar, permissionKey: 'followups' },
  { name: 'Payments', href: '/payments', icon: DollarSign, permissionKey: 'payments' },
]

export default function MobileHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { permissions, role, isAdmin } = usePermissions()
  const [isOpen, setIsOpen] = useState(false)
  const [personalization, setPersonalization] = useState<{
    companyName: string
  }>({
    companyName: ''
  })

  // Check page access permissions
  const canAccessDashboard = permissions?.pages?.dashboard !== false
  const canAccessContacts = permissions?.pages?.contacts !== false
  const canAccessPipeline = permissions?.pages?.pipeline !== false
  const canAccessFollowups = permissions?.pages?.followups !== false
  const canAccessPayments = permissions?.pages?.payments !== false

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

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

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
    <>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <span className="mobile-header-brand">
            {personalization.companyName || 'Kortex360'}
          </span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="mobile-header-menu-btn"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div 
            className="mobile-menu-overlay"
            onClick={() => setIsOpen(false)}
          />
          <nav className="mobile-menu">
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">
                {personalization.companyName || 'Kortex360'}
              </span>
            </div>
            <div className="mobile-menu-nav">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="mobile-menu-icon" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              {/* Settings - Admin Only */}
              {isAdmin && (
                <Link
                  href="/settings"
                  className={`mobile-menu-item ${pathname === '/settings' ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="mobile-menu-icon" />
                  <span>Settings</span>
                </Link>
              )}
            </div>
            
            {/* Neon accent line */}
            <div className="mobile-menu-footer">
              <div className="mobile-menu-neon-line" />
            </div>
          </nav>
        </>
      )}
    </>
  )
}
