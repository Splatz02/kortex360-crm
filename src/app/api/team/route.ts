import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamMembers = await prisma.teamMember.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  return NextResponse.json(teamMembers)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { email, password, name, permissions } = body

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check if email already exists
  const existing = await prisma.teamMember.findUnique({
    where: { email }
  })

  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const teamMember = await prisma.teamMember.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'member',
      permissions: JSON.stringify(permissions || {})
    }
  })

  return NextResponse.json({
    id: teamMember.id,
    email: teamMember.email,
    name: teamMember.name,
    role: teamMember.role,
    permissions: teamMember.permissions,
    createdAt: teamMember.createdAt,
    updatedAt: teamMember.updatedAt,
  })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing member ID' }, { status: 400 })
  }

  await prisma.teamMember.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}