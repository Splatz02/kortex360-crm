export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint to get personalization settings for display in sidebar
// Does not require authentication
export async function GET() {
  try {
    let settings = await prisma.personalizationSettings.findUnique({
      where: { id: 'default' }
    })

    // Return default values if no settings exist
    if (!settings) {
      return NextResponse.json({
        id: 'default',
        companyName: ''
      })
    }

    // Return only companyName
    return NextResponse.json({
      id: settings.id,
      companyName: settings.companyName
    })
  } catch (error) {
    console.error('Error fetching personalization settings:', error)
    return NextResponse.json({ 
      id: 'default',
      companyName: ''
    })
  }
}