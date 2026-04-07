'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, LayoutDashboard } from 'lucide-react'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (!session) {
    redirect('/login')
  }

  const tabs = [
    { name: 'Team', href: '/settings/team', icon: Users },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#00f0ff', textShadow: '0 0 10px #00f0ff' }}>
          Settings
        </h1>
      </div>

      <div className="border-b" style={{ borderColor: '#2a2a2a' }}>
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex items-center py-4 px-1 border-b-2 text-sm font-medium transition-all"
                style={{
                  borderColor: isActive ? '#00f0ff' : 'transparent',
                  color: isActive ? '#00f0ff' : '#9ca3af',
                }}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}