import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let settings = await prisma.personalizationSettings.findUnique({
      where: { id: 'default' }
    })

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.personalizationSettings.create({
        data: {
          id: 'default',
          companyName: '',
          logoPath: '',
          displayMode: 'company_name'
        }
      })
    }

    // Return only companyName to frontend
    return NextResponse.json({
      id: settings.id,
      companyName: settings.companyName
    })
  } catch (error) {
    console.error('Error fetching personalization settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const companyName = body.companyName || ''

    // Upsert settings - keep existing logoPath and displayMode but only update companyName
    const settings = await prisma.personalizationSettings.upsert({
      where: { id: 'default' },
      update: {
        companyName
      },
      create: {
        id: 'default',
        companyName,
        logoPath: '',
        displayMode: 'company_name'
      }
    })

    return NextResponse.json({
      id: settings.id,
      companyName: settings.companyName
    })
  } catch (error) {
    console.error('Error saving personalization settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}