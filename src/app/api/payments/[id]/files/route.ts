import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const files = await prisma.paymentFile.findMany({
      where: { paymentId: id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Verify payment exists
    const payment = await prisma.payment.findUnique({ where: { id } })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payments')
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fileExt = path.extname(file.name)
    const filename = `${uniqueSuffix}${fileExt}`
    const filePath = path.join(uploadDir, filename)

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Save file metadata to database
    const paymentFile = await prisma.paymentFile.create({
      data: {
        paymentId: id,
        filename: file.name,
        fileType: file.type || 'application/octet-stream',
        filePath: `/uploads/payments/${filename}`
      }
    })

    return NextResponse.json(paymentFile, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}