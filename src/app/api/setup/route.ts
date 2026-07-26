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

  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

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
