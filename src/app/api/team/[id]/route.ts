import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: memberId } = await params
  const body = await request.json()
  const { name, permissions, password } = body

  const updateData: any = {}
  if (name) updateData.name = name
  if (permissions) updateData.permissions = JSON.stringify(permissions)
  if (password) updateData.password = await bcrypt.hash(password, 10)

  const teamMember = await prisma.teamMember.update({
    where: { id: memberId },
    data: updateData
  })

  return NextResponse.json({
    id: teamMember.id,
    email: teamMember.email,
    name: teamMember.name,
    role: teamMember.role,
    permissions: teamMember.permissions,
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: memberId } = await params

  // Don't allow deleting yourself
  if (session.user.id === memberId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  await prisma.teamMember.delete({
    where: { id: memberId }
  })

  return NextResponse.json({ success: true })
}