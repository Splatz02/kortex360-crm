import NextAuth from 'next-auth'

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
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
        }
        actions: {
          add_contacts: boolean
          import_contacts: boolean
          edit_contacts: boolean
          delete_contacts: boolean
        }
        dashboard: {
          see_revenue: boolean
          see_analytics: boolean
          see_pipeline_stats: boolean
        }
      }
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role?: string
    permissions?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: string
    permissions?: any
  }
}