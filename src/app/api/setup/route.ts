import { prisma } from '@/lib/db';

const MIGRATIONS = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  `CREATE EXTENSION IF NOT EXISTS "pg_trgm"`,

  `CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM')`,
  `CREATE TYPE "WorkspaceRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEMBER')`,
  `CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED')`,
  `CREATE TYPE "TaskPriority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT')`,
  `CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF')`,
  `CREATE TYPE "DependencyMode" AS ENUM ('STRICT', 'FLEXIBLE')`,
  `CREATE TYPE "ViewLayout" AS ENUM ('TABLE', 'LIST', 'KANBAN', 'CALENDAR', 'GANTT')`,
  `CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_UNASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_COMMENTED', 'TASK_MENTIONED', 'TASK_DUE_SOON')`,
  `CREATE TYPE "DiscountType" AS ENUM ('LIFETIME', 'FIRST_YEAR')`,
  `CREATE TYPE "DiscountScope" AS ENUM ('BOTH', 'MONTHLY', 'ANNUAL')`,
  `CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'VIEWER')`,

  `CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email")`,

  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "isSaasAdmin" BOOLEAN NOT NULL DEFAULT false,
    "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSaasAdmin" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`,

  `CREATE TABLE IF NOT EXISTS "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "siteName" TEXT NOT NULL DEFAULT 'Opchestra',
    "signupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailProvider" TEXT NOT NULL DEFAULT 'resend',
    "emailApiKey" TEXT,
    "emailFromAddress" TEXT NOT NULL DEFAULT 'noreply@opchestra.com',
    "emailFromName" TEXT NOT NULL DEFAULT 'Opchestra',
    "r2AccountId" TEXT,
    "r2AccessKeyId" TEXT,
    "r2SecretAccessKey" TEXT,
    "r2BucketName" TEXT NOT NULL DEFAULT 'opchestra',
    "r2PublicUrl" TEXT,
    "maxFreeUsers" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "maintenanceWhitelistDomains" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "disableLogin" BOOLEAN NOT NULL DEFAULT false`,

  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "adminUserId" TEXT,
    "targetUserId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_adminUserId_idx" ON "AuditLog"("adminUserId")`,
  `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "adminUserEmail" TEXT`,

  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`,

  `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token")`,

  `CREATE TABLE IF NOT EXISTS "Workspace" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "staleThresholdDays" INTEGER NOT NULL DEFAULT 14,
    "ticketPrefix" TEXT NOT NULL DEFAULT 'TKT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug")`,

  `CREATE TABLE IF NOT EXISTS "InviteToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InviteToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token")`,

  `CREATE TABLE IF NOT EXISTS "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "emailProvider" TEXT,
    "emailApiKey" TEXT,
    "emailFromAddress" TEXT,
    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId")`,

  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultViewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Project_workspaceId_idx" ON "Project"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "parentTaskId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NONE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "timeEstimate" INTEGER,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Task_workspaceId_idx" ON "Task"("workspaceId")`,
  `CREATE INDEX IF NOT EXISTS "Task_projectId_idx" ON "Task"("projectId")`,
  `CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task"("assigneeId")`,
  `CREATE INDEX IF NOT EXISTS "Task_parentTaskId_idx" ON "Task"("parentTaskId")`,
  `CREATE INDEX IF NOT EXISTS "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status")`,

  `CREATE TABLE IF NOT EXISTS "Label" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Label_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Label_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Label_workspaceId_name_key" ON "Label"("workspaceId", "name")`,

  `CREATE TABLE IF NOT EXISTS "TaskLabel" (
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    CONSTRAINT "TaskLabel_pkey" PRIMARY KEY ("taskId", "labelId"),
    CONSTRAINT "TaskLabel_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "TaskDependency" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL DEFAULT 'FS',
    "mode" "DependencyMode" NOT NULL DEFAULT 'FLEXIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TaskDependency_taskId_dependsOnId_key" ON "TaskDependency"("taskId", "dependsOnId")`,

  `CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Comment_taskId_idx" ON "Comment"("taskId")`,

  `CREATE TABLE IF NOT EXISTS "TimeEntry" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "TimeEntry_taskId_idx" ON "TimeEntry"("taskId")`,
  `CREATE INDEX IF NOT EXISTS "TimeEntry_userId_idx" ON "TimeEntry"("userId")`,

  `CREATE TABLE IF NOT EXISTS "File" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "taskId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "File_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "File_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "File_taskId_idx" ON "File"("taskId")`,

  `CREATE TABLE IF NOT EXISTS "StatusWorkflow" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "statuses" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusWorkflow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StatusWorkflow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "StatusWorkflow_workspaceId_idx" ON "StatusWorkflow"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "View" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" "ViewLayout" NOT NULL DEFAULT 'TABLE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "View_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "View_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "View_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "View_workspaceId_idx" ON "View"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")`,
  `CREATE INDEX IF NOT EXISTS "Notification_workspaceId_idx" ON "Notification"("workspaceId")`,

  `CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`,
  `CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`,

  `CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status")`,
  `CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId")`,

  `CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "adminUserEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId")`,

  `CREATE TABLE IF NOT EXISTS "DiscountCode" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL DEFAULT 'LIFETIME',
    "percentOff" INTEGER NOT NULL,
    "billingScope" "DiscountScope" NOT NULL DEFAULT 'BOTH',
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key" ON "DiscountCode"("code")`,

  `CREATE TABLE IF NOT EXISTS "CustomFieldDefinition" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomFieldDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CustomFieldDefinition_workspaceId_name_key" ON "CustomFieldDefinition"("workspaceId", "name")`,
  `CREATE INDEX IF NOT EXISTS "CustomFieldDefinition_workspaceId_idx" ON "CustomFieldDefinition"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "CustomFieldValue" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "customFieldDefinitionId" TEXT NOT NULL,
    "value" JSONB,
    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomFieldValue_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomFieldValue_customFieldDefinitionId_fkey" FOREIGN KEY ("customFieldDefinitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CustomFieldValue_taskId_customFieldDefinitionId_key" ON "CustomFieldValue"("taskId", "customFieldDefinitionId")`,
  `CREATE INDEX IF NOT EXISTS "CustomFieldValue_taskId_idx" ON "CustomFieldValue"("taskId")`,

  `CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Company_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Company_workspaceId_idx" ON "Company"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "companyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Contact_workspaceId_idx" ON "Contact"("workspaceId")`,
  `CREATE INDEX IF NOT EXISTS "Contact_companyId_idx" ON "Contact"("companyId")`,

  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ticketNumber" TEXT`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "source" TEXT`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "contactId" TEXT`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "companyId" TEXT`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "slaResponseDue" TIMESTAMP(3)`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "slaResolutionDue" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "Task_ticketNumber_idx" ON "Task"("ticketNumber")`,

  `CREATE TABLE IF NOT EXISTS "SlaRule" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlaRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SlaRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SlaRule_workspaceId_priority_key" ON "SlaRule"("workspaceId", "priority")`,
  `CREATE INDEX IF NOT EXISTS "SlaRule_workspaceId_idx" ON "SlaRule"("workspaceId")`,

  `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
  `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT`,
  `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "stripePlanId" TEXT`,
  `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT`,
  `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3)`,
  `ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "seatLimit" INTEGER NOT NULL DEFAULT 3`,

  `CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')`,

  `CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "publicKey" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_publicKey_key" ON "Invoice"("publicKey")`,
  `CREATE INDEX IF NOT EXISTS "Invoice_workspaceId_idx" ON "Invoice"("workspaceId")`,

  `CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceAnnual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxUsers" INTEGER NOT NULL DEFAULT 3,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdAnnual" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planId" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN DEFAULT false`,

  `CREATE TABLE IF NOT EXISTS "TaskGroup" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TaskGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskGroup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "TaskGroup_workspaceId_idx" ON "TaskGroup"("workspaceId")`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "taskGroupId" TEXT REFERENCES "TaskGroup"("id") ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS "Task_taskGroupId_idx" ON "Task"("taskGroupId")`,

  `DROP INDEX IF EXISTS "TaskGroup_projectId_idx"`,
  `ALTER TABLE "TaskGroup" DROP CONSTRAINT IF EXISTS "TaskGroup_projectId_fkey"`,
  `ALTER TABLE "TaskGroup" DROP COLUMN IF EXISTS "projectId"`,

  `CREATE TABLE IF NOT EXISTS "Phase" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Phase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Phase_projectId_idx" ON "Phase"("projectId")`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "phaseId" TEXT REFERENCES "Phase"("id") ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS "Task_phaseId_idx" ON "Task"("phaseId")`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sourceTicketId" TEXT REFERENCES "Task"("id") ON DELETE SET NULL`,

  `CREATE TABLE IF NOT EXISTS "ActiveTimer" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "totalPaused" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActiveTimer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActiveTimer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveTimer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveTimer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ActiveTimer_userId_taskId_key" ON "ActiveTimer"("userId", "taskId")`,
  `CREATE INDEX IF NOT EXISTS "ActiveTimer_userId_idx" ON "ActiveTimer"("userId")`,

  `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0`,
];

export async function POST() {
  const results: Array<{ sql: string; status: string }> = [];

  for (const sql of MIGRATIONS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push({ sql: sql.substring(0, 60), status: 'ok' });
    } catch (e) {
      const msg = String(e);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        results.push({ sql: sql.substring(0, 60), status: 'skipped (exists)' });
      } else {
        results.push({ sql: sql.substring(0, 60), status: `error: ${msg.substring(0, 100)}` });
      }
    }
  }

  const errors = results.filter((r) => r.status.startsWith('error'));

  return Response.json({
    errors: errors.length,
    message: errors.length === 0 ? 'All migrations applied' : 'Some migrations failed',
    results,
    total: results.length,
  });
}
