import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params
  try {
    // Get file record first
    const file = await prisma.paymentFile.findUnique({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from database
    await prisma.paymentFile.delete({ where: { id: fileId } })

    // Delete physical file
    const filePath = path.join(process.cwd(), 'public', file.filePath)
    try {
      await unlink(filePath)
    } catch (err) {
      // File may not exist, continue anyway
      console.warn('Could not delete physical file:', err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}