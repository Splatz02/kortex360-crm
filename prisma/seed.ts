import { PrismaClient } from '@prisma/client'
import { randomUUID } from "crypto";

const prisma = new PrismaClient()

const contacts = [
  {
    firstName: 'John',
    lastName: 'Smith',
    title: 'CEO',
    company: 'TechCorp',
    email: 'john@techcorp.com',
    phone: '+1 555-0101',
    icpStatus: 'Hot',
    contactStatus: 'Qualified',
    interestStatus: 'Interested',
    dealValue: 25000,
    pipelineStatus: 'demo_scheduled',
    environment: 'cold_calling',
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    title: 'VP Sales',
    company: 'GrowthXYZ',
    email: 'sarah@growthxyz.com',
    phone: '+1 555-0102',
    icpStatus: 'Warm',
    contactStatus: 'Contacted',
    interestStatus: 'Pending',
    dealValue: 15000,
    pipelineStatus: 'needs_follow_up',
    environment: 'cold_calling',
  },
  {
    firstName: 'Mike',
    lastName: 'Williams',
    title: 'Founder',
    company: 'StartupHub',
    email: 'mike@startuphub.io',
    phone: '+1 555-0103',
    icpStatus: 'Cold',
    contactStatus: 'New',
    interestStatus: 'Not Yet Asked',
    dealValue: 5000,
    pipelineStatus: 'not_yet_called',
    environment: 'cold_calling',
  },
  {
    firstName: 'Emily',
    lastName: 'Brown',
    title: 'Director',
    company: 'Enterprise Inc',
    email: 'emily@enterprise.com',
    phone: '+1 555-0104',
    icpStatus: 'Hot',
    contactStatus: 'Converted',
    interestStatus: 'Interested',
    dealValue: 50000,
    pipelineStatus: 'closed_collected',
    environment: 'cold_calling',
  },
  {
    firstName: 'David',
    lastName: 'Miller',
    title: 'Manager',
    company: 'SmallBiz LLC',
    email: 'david@smallbiz.com',
    phone: '+1 555-0105',
    icpStatus: 'Warm',
    contactStatus: 'Qualified',
    interestStatus: 'Interested',
    dealValue: 8000,
    pipelineStatus: 'interested',
    environment: 'cold_calling',
  },
  {
    firstName: 'Lisa',
    lastName: 'Davis',
    title: 'CTO',
    company: 'Innovation Labs',
    email: 'lisa@innovationlabs.com',
    phone: '+1 555-0106',
    icpStatus: 'Cold',
    contactStatus: 'Lost',
    interestStatus: 'Not Interested',
    dealValue: 0,
    pipelineStatus: 'not_interested',
    environment: 'cold_calling',
  },
  {
    firstName: 'Alex',
    lastName: 'Garcia',
    title: 'CEO',
    company: 'RVM Outreach Co',
    email: 'alex@rvmoutreach.com',
    phone: '+1 555-0201',
    icpStatus: 'Warm',
    contactStatus: 'New',
    interestStatus: 'Not Yet Asked',
    dealValue: 10000,
    pipelineStatus: 'not_yet_called',
    environment: 'rvm_outreach',
  },
  {
    firstName: 'Jennifer',
    lastName: 'Martinez',
    title: 'Operations',
    company: 'CallCenter Pro',
    email: 'jen@callcenterpro.com',
    phone: '+1 555-0202',
    icpStatus: 'Warm',
    contactStatus: 'Contacted',
    interestStatus: 'Pending',
    dealValue: 7500,
    pipelineStatus: 'pending_projected',
    environment: 'rvm_outreach',
  },
]

const followUps = [
  {
    type: 'call',
    status: 'pending',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  },
  {
    type: 'email',
    status: 'pending',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
  },
  {
    type: 'demo',
    status: 'pending',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
  },
]

const payments = [
  { type: 'payment', amount: 5000, category: 'Service', description: 'Website design project', date: new Date('2024-01-15') },
  { type: 'expense', amount: 150, category: 'Software', description: 'Monthly SaaS subscription', date: new Date('2024-01-20') },
  { type: 'payment', amount: 3000, category: 'Service', description: 'Consulting engagement', date: new Date('2024-02-01') },
  { type: 'expense', amount: 75, category: 'Office', description: 'Office supplies', date: new Date('2024-02-05') },
  { type: 'payment', amount: 12000, category: 'Service', description: 'Development project', date: new Date('2024-02-10') },
]

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.communication.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()

  // Create contacts
  const createdContacts = []
  for (let i = 0; i < contacts.length; i++) {
    const contact = await prisma.contact.create({
      data: contacts[i],
    })
    createdContacts.push(contact)

    // Create follow-ups for first 3 contacts
    if (i < 3) {
      await prisma.followUp.create({
        data: {
          contactId: contact.id,
          type: followUps[i].type,
          status: followUps[i].status,
          dueDate: followUps[i].dueDate,
          notes: `Follow-up for ${contact.firstName} ${contact.lastName}`,
        },
      })
    }

    // Create payments for some contacts
    if (i < payments.length) {
      await prisma.payment.create({
        data: {
          paymentId: randomUUID(),
          contactId: i < 4 ? contact.id : null,
          type: payments[i].type,
          amount: payments[i].amount,
          category: payments[i].category,
          description: payments[i].description,
          date: payments[i].date,
        },
      })
    }
  }

  console.log('Seeding completed!')
  console.log(`Created ${createdContacts.length} contacts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })