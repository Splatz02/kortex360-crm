-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "icpStatus" TEXT NOT NULL DEFAULT 'Cold',
    "serviceQualifier" TEXT,
    "phoneType" TEXT NOT NULL DEFAULT 'Unknown',
    "contactStatus" TEXT NOT NULL DEFAULT 'New',
    "interestStatus" TEXT NOT NULL DEFAULT 'Not Yet Asked',
    "smsOptIn" TEXT NOT NULL DEFAULT 'Pending',
    "dealValue" REAL NOT NULL DEFAULT 0,
    "pipelineStatus" TEXT NOT NULL DEFAULT 'not_yet_called',
    "assetLink" TEXT,
    "assetNotes" TEXT,
    "callComments" TEXT,
    "followUpNote" TEXT,
    "leadNotes" TEXT,
    "outreachHistory" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'cold_calling',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'not_yet_called',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'manual',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Communication_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
