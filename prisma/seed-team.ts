import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'ben@kortex360.com'
  const adminPassword = 'NewYear1910590117$IX'
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  
  // Create admin user with full permissions
  const adminPermissions = {
    pages: {
      contacts: true,
      pipeline: true,
      followups: true,
      payments: true
    },
    actions: {
      add_contacts: true,
      import_contacts: true,
      edit_contacts: true,
      delete_contacts: true
    },
    dashboard: {
      see_revenue: true,
      see_analytics: true,
      see_pipeline_stats: true
    }
  }
  
  // Check if admin already exists
  const existingAdmin = await prisma.teamMember.findUnique({
    where: { email: adminEmail }
  })
  
  if (!existingAdmin) {
    await prisma.teamMember.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        permissions: JSON.stringify(adminPermissions)
      }
    })
    console.log('Admin user created successfully')
  } else {
    console.log('Admin user already exists')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })