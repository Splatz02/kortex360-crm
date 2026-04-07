import Sidebar from '@/components/Sidebar'
import MobileHeader from '@/components/MobileHeader'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <MobileHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
