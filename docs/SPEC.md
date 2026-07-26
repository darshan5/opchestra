# Opchestra — Product Specification

## Overview

Opchestra is a business operating system for small-to-medium teams (10-50 people). It combines project management, task management, ticket management, time tracking, and invoicing into a single multi-tenant SaaS platform.

**Target users:** Small-to-medium teams who currently cobble together multiple tools (Asana + Zendesk + Harvest + FreshBooks) and want one unified system.

**Business model:** Per-seat pricing with a free tier. Free for up to 3 users, then $9-12/user/month. One login supports multiple workspaces.

---

## Core Architecture

### Multi-Tenancy

Shared PostgreSQL database with row-level tenancy. Every table that holds user data includes a `workspaceId` foreign key. A Prisma middleware injects `where: { workspaceId }` on every query to enforce tenant isolation.

### Data Model Philosophy

**Flat task pool with saved views.** All tasks live in one flat pool per workspace. Projects, assignees, and labels are fields on the task — not structural containers. Views are saved configurations (layout + filters + sort + grouping + column visibility) that query the same task pool. A task can appear in multiple views without duplication.

### Real-Time Updates

Server-Sent Events (SSE). User actions go through normal API calls; the server pushes updates to connected clients. One-directional (server to client). No WebSocket infrastructure needed at this scale.

### File Storage

Cloudflare R2 (S3-compatible). Files are uploaded directly from the client to R2 via presigned URLs — no server bottleneck. File metadata (filename, size, MIME type, task association) is stored in PostgreSQL.

- Max file size: 25MB per file
- Max storage: 5GB per workspace (free tier), 50GB (paid)

### Tech Stack

- **Framework:** Next.js (App Router, server components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Email/password with NextAuth.js (Auth.js)
- **Email:** Resend API (configurable by Super Admin)
- **File Storage:** Cloudflare R2
- **Deployment:** Docker Compose via Dokploy
- **Testing:** Vitest (unit) + Playwright or Supertest (integration)

---

## Authentication & Onboarding

### Sign Up Flow

1. User enters email + password
2. Email verification sent
3. User verifies email
4. Create workspace — name + URL slug (e.g., `app.opchestra.com/acme-corp`)
5. Invite team members (skippable) — enter email addresses
6. Create first project (guided prompt with starter tasks)

The user who creates the workspace becomes **Super Admin**.

### Admin-Created Users

Super Admins and Admins can create user accounts directly within their workspace. They assign a role and the user receives an email invite to set their password. No separate email verification needed — the invite link itself acts as verification.

### Multi-Workspace

A single user account (one email, one password) can belong to multiple workspaces. A workspace switcher in the sidebar lets users move between them. A freelancer might be Super Admin of their own workspace and a Member in a client's workspace.

---

## Roles & Permissions

Four roles, hierarchical:

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Everything — billing, delete workspace, manage roles, manage members, workspace settings |
| **Admin** | Manage members, workspace settings. Cannot access billing or delete workspace. |
| **Manager** | Create/edit/archive projects. Create/edit shared views. Assign/reassign tasks to any member. Set milestones and dependencies. View workload across team. Edit any task. |
| **Member** | Create/edit tasks (own or assigned to them). Create personal views. Log time. |

No per-project permissions in v1. All workspace members can see all projects.

---

## Workspace Navigation

Sidebar layout (collapsible):

```
[Workspace Switcher]
---
Home (dashboard)
My Tasks
---
Projects
  Project A
  Project B
  + New Project
---
Views (saved shared views)
  Sprint Board
  Team Timeline
  + New View
---
Time Tracking
Invoicing
---
Settings (gear icon)
Members (people icon)
```

- **Home** — personal dashboard with Activity & Upcoming widget
- **My Tasks** — pre-built personal view of everything assigned to the user
- **Projects** — expandable list; clicking a project opens its default view
- **Views** — shared views as top-level sidebar items
- Sidebar collapses to hamburger menu on small screens

---

## Tasks

### Built-In Fields

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Required |
| `description` | rich text | Tiptap block editor with @mentions |
| `status` | enum | Customizable per workspace (default: Todo, In Progress, Done) |
| `priority` | enum | None, Low, Medium, High, Urgent |
| `assigneeId` | user ref | Single workspace member |
| `startDate` | date | Optional. Combined with endDate for timeline/Gantt. |
| `endDate` | date | Optional. If only endDate is set, acts as a due date. |
| `labels` | tag[] | Multiple, customizable per workspace |
| `projectId` | project ref | Optional. Which project this task belongs to. |
| `parentTaskId` | task ref | Self-referential. Max depth: 4 levels (task > sub > sub > sub). |
| `timeEstimate` | duration | Hours. Used for workload calculations. |
| `isMilestone` | boolean | Default false. Renders as diamond in Gantt/Timeline views. |
| `completedAt` | timestamp | System field. Auto-set when status changes to a "done" state. |
| `createdAt` | timestamp | System field. |
| `updatedAt` | timestamp | System field. |
| `lastActivityAt` | timestamp | Updated on any change (status, comment, assignment). Used for age/staleness. |

### Sub-Tasks

Tasks have a `parentTaskId` (self-referential foreign key). Maximum depth of 4 levels enforced at the application layer. Sub-tasks inherit the workspace and can optionally inherit the project from their parent.

### Dependencies

Stored in a separate join table:

```
TaskDependency
  taskId        → Task (the blocked task)
  dependsOnId   → Task (the blocking task)
  type          → enum: FS (Finish-to-Start), SS (Start-to-Start),
                        FF (Finish-to-Finish), SF (Start-to-Finish)
  mode          → enum: strict, flexible
```

- **Strict mode:** dependent task dates auto-shift when the blocking task changes.
- **Flexible mode:** dependency is informational; dates don't auto-shift.

### Task Age

Computed field: `now - createdAt`. Displayed as human-readable ("2d 5h", "3 weeks"). Workspace-level setting for stale threshold — items with no activity for N days are flagged as stale. Applies to all tasks and tickets.

### Task Detail Panel

Slide-over panel from the right side (like Linear/Asana). Keeps the view context visible behind it. Expand icon opens full-page view.

**Panel layout:**

- **Header:** Title (inline-editable), Status, Priority, Assignee (all inline-editable dropdowns)
- **Tabs:** Details | Activity | Time Log
- **Details tab:**
  - Description (Tiptap rich text editor)
  - Fields section (all built-in + custom fields, inline-editable)
  - Sub-tasks list (with add button)
  - Dependencies list (with add button)
  - Files/attachments (with upload button)
- **Activity tab:** Comments + activity feed (status changes, assignment changes, mentions). Chronological timeline.
- **Time Log tab:** Time entries logged against this task (start/stop or manual).

---

## Rich Text Editor

Tiptap (ProseMirror-based), integrated with React.

**Supported blocks:**
- Headings (H1, H2, H3)
- Paragraphs with inline formatting (bold, italic, strikethrough, inline code, links)
- Bullet lists and numbered lists
- Checklists (toggleable checkboxes)
- Code blocks (syntax highlighting)
- Blockquotes
- Horizontal dividers
- Images (uploaded to R2)
- File attachments (inline)
- @user mentions (autocomplete dropdown, triggers notification)

---

## Custom Fields

Workspace-level definitions. A custom field is defined once for the workspace and available across all projects. Views choose which fields to display.

**Limits:** 20 custom fields per workspace (free tier), 50 (paid).

### Custom Field Types (17)

| Category | Type | Description |
|----------|------|-------------|
| **Basic** | Text | Single-line string |
| | Long Text | Multi-line / rich text |
| | Number | Integer or decimal, optional unit suffix |
| | Checkbox | Boolean toggle |
| **Selection** | Dropdown | Single-select from defined options with colors |
| | Multi-select | Multiple selections from defined options |
| **Date/Time** | Date | Calendar date picker |
| | Hour | Time of day |
| **People** | Person | Reference to a workspace member |
| **Links** | URL | Clickable link with optional display text |
| | Email | Email address, clickable |
| | Phone | Phone number |
| **Media** | Files | File attachments (uploaded to R2) |
| **Advanced** | Rating | 1-5 stars |
| | Currency | Number with currency symbol |
| | Formula | Computed from other fields |
| | Location | Address / coordinates |
| | Color | Color picker |

### Data Model

```
CustomFieldDefinition
  id
  workspaceId
  name
  type          → enum (one of 17 types)
  config        → JSON (type-specific: dropdown options, currency symbol, formula expression, etc.)
  createdAt

CustomFieldValue
  id
  taskId
  fieldDefinitionId
  value         → JSON (flexible storage for any type)
```

---

## Views

### Layout Types (5)

| Layout | Description |
|--------|-------------|
| **Table** | Spreadsheet-style rows with visible columns. Sortable, groupable. Default for "all tasks" views. |
| **List** | Compact, minimal — task title + key fields. Good for personal "my tasks" views. |
| **Kanban** | Cards grouped by status or any single-select field. Drag-and-drop between columns. |
| **Calendar** | Tasks plotted on month/week/day grid by their dates. |
| **Gantt** | Timeline bars with dependencies (arrow connectors) and milestones (diamonds). |

### View Configuration

Each saved view stores:
- Layout type
- Filters (field + operator + value, combinable with AND/OR)
- Sort order (field + direction, multi-level)
- Grouping (group by a field — status, project, assignee, etc.)
- Column visibility and order (which fields are shown, in what order)

### Ownership & Sharing

| Type | Visibility | Who can create | Who can edit |
|------|-----------|----------------|-------------|
| **Personal** | Only the creator | Any member | Only the creator |
| **Shared** | Everyone in workspace | Manager+ | Manager+ |
| **Default** | Auto-opens when entering a project | Set by Manager+ | Manager+ |

Any member can duplicate a shared view into a personal one to customize it.

---

## Projects

A project is a label/relation on tasks — not a structural container.

```
Project
  id
  workspaceId
  name
  description
  status        → enum: active, archived
  defaultViewId → View (the view that opens when clicking the project)
  createdAt
  updatedAt
```

Tasks reference a project via `projectId`. A task can belong to zero or one project.

---

## Notifications

### Triggers

| Event | Who gets notified |
|-------|-------------------|
| Assigned to a task | The assignee |
| Unassigned from a task | The previously assigned user |
| Task status changed | The assignee |
| Comment on a task | The assignee + anyone who commented before (watching) |
| @mentioned in comment or description | The mentioned user |
| Task they're watching has activity | Watchers |
| Due date approaching (1 day before) | The assignee |

### Channels

- **In-app:** Bell icon in top bar, dropdown with unread notifications, mark as read.
- **Email:** Via Resend API. Configurable per user.

### User Preferences

Each user can toggle on/off per trigger type, per channel. Defaults:
- In-app: all triggers on
- Email: only mentions and assignments

### Dashboard Widget — Activity & Upcoming

A persistent widget on the Home dashboard showing:

- **Activity feed:** Recent changes — assignments, status changes, comments, mentions
- **Upcoming:** Tasks due soon, milestones approaching, overdue items
- Color-coded by urgency: overdue (red), due today (orange), upcoming (yellow)
- Grouped by: Today, Tomorrow, This Week

### Admin Email Configuration

Super Admin settings page for email integration:

```
Settings > Integrations > Email
  Provider: Resend
  API Key: [encrypted]
  From Address: notifications@opchestra.com
  [Test Connection] [Save]
```

Integration credentials stored in a workspace-level settings table, encrypted at rest.

---

## Time Tracking

Attached to tasks. Two entry modes:

- **Timer:** Start/stop button on the task. Records start time, end time, and duration.
- **Manual:** Enter date + duration directly.

```
TimeEntry
  id
  workspaceId
  taskId
  userId
  startTime     → timestamp (for timer entries)
  endTime       → timestamp (for timer entries)
  duration      → integer (minutes)
  date          → date (for manual entries)
  notes         → text (optional)
  billable      → boolean (default true)
  createdAt
```

Visible in the **Time Log** tab on the task detail panel. Also accessible via the **Time Tracking** sidebar section for a personal/team-wide view of logged time.

---

## Company & Contact Database (Lightweight CRM)

### Company

```
Company
  id
  workspaceId
  name
  domain        → string (e.g., "acme.com" — used for auto-matching inbound emails)
  industry      → string (optional)
  notes         → text (optional)
  createdAt
  updatedAt
```

### Contact

```
Contact
  id
  workspaceId
  name
  email
  phone         → string (optional)
  title         → string (optional, job title/role)
  companyId     → Company (optional)
  notes         → text (optional)
  createdAt
  updatedAt
```

Custom fields (same system as tasks) can be extended to Companies and Contacts in the future.

### Auto-Matching

When an inbound email arrives from `john@acme.com`:
1. Search Contacts by email. If found, link the ticket to that Contact and their Company.
2. If not found, create a new Contact. Match the domain (`acme.com`) to an existing Company. If no Company match, create a new Company from the domain.

---

## Ticket Management

Tickets are tasks with a ticket-specific configuration layer. No separate data model — a ticket is a task with additional fields and behaviors.

### Additional Ticket Fields

| Field | Type | Notes |
|-------|------|-------|
| `ticketNumber` | string | Auto-incrementing per workspace (e.g., `OPC-142`). Prefix configurable. |
| `source` | enum | email, form, portal, manual |
| `contactId` | contact ref | The external requester |
| `companyId` | company ref | Auto-derived from contact, or set manually |
| `slaResponseDue` | timestamp | Calculated from priority-based SLA rules |
| `slaResolutionDue` | timestamp | Calculated from priority-based SLA rules |

### Status Workflows

Named sets of statuses that can be assigned to a project or used workspace-wide.

```
StatusWorkflow
  id
  workspaceId
  name          → e.g., "Task Workflow", "Ticket Workflow", "Bug Workflow"
  statuses      → JSON array of { name, color, category }
```

Status category is one of: `todo`, `in_progress`, `done`, `closed`. This lets the system know which statuses represent completion (for `completedAt`, SLA tracking, etc.) regardless of custom naming.

Default workflows:
- **Task:** Todo → In Progress → Done
- **Ticket:** Open → In Progress → Waiting on Customer → Resolved → Closed

### Ticket Numbering

Auto-incrementing per workspace. Prefix is configurable in workspace settings (default: first 3 letters of workspace name, e.g., `OPC-`).

### SLA Rules

Per-priority response and resolution targets, configured at the workspace level.

```
SlaRule
  workspaceId
  priority      → enum (Low, Medium, High, Urgent)
  responseTime  → integer (minutes)
  resolutionTime → integer (minutes)
```

Tickets track `slaResponseDue` and `slaResolutionDue` timestamps. Overdue SLA is flagged visually and can trigger notifications.

### Email-to-Ticket Pipeline

Inbound emails are received at a workspace-specific address. Processing:

1. **Parse subject line** for existing ticket number (e.g., `Re: [OPC-142] Login issue`).
2. **If ticket number found:** Append email body as a comment on the existing ticket. Auto-match sender to Contact.
3. **If no ticket number:** Place in the **Ticket Inbox** queue for triage.

**Ticket Inbox** — a dedicated triage screen for Managers:
- See all unprocessed inbound emails
- For each email, choose:
  - **Assign as new ticket** — creates a ticket with auto-assigned number
  - **Ignore** — archive the email, do nothing
  - **Merge** — link this email to an existing open ticket as a comment

### Public Submission Form

A shareable URL (e.g., `app.opchestra.com/acme-corp/submit`) where external people can submit tickets without an account. Submitter provides: name, email, subject, description, optional file attachments. Creates a Contact (if new) and a ticket in the inbox queue.

---

## Search

Global search bar in the top navigation. Searches task titles and descriptions (full-text search via PostgreSQL). Returns results across the entire workspace. Available to all roles.

---

## Dashboard — Home

The Home page is a personal dashboard showing:

1. **Activity & Upcoming Widget** — combined feed of recent activity and upcoming deadlines (see Notifications section)
2. **My Tasks Summary** — count of tasks by status (todo, in progress, overdue)
3. **Recent Projects** — quick links to recently accessed projects

---

## Dark Mode

Supported from day one. Tailwind CSS `dark:` variants throughout. Defaults to system preference (`prefers-color-scheme`). User can override in settings (Light / Dark / System).

---

## Responsive Design

Responsive but not mobile-optimized. Layouts don't break on small screens:
- Sidebar collapses to hamburger menu
- Task detail panel goes full-screen on mobile
- Table view gets horizontal scroll
- All interactive elements are touch-friendly

Dedicated mobile patterns (bottom tab bar, swipe gestures, mobile-specific views) are deferred.

---

## Database Schema Overview

Core tables:

```
Workspace
User
WorkspaceMember         (user + workspace + role)
Project
Task
TaskDependency          (task-to-task with type and mode)
CustomFieldDefinition   (per workspace)
CustomFieldValue        (per task)
View                    (personal or shared, per workspace)
Comment                 (on tasks, with @mentions)
TimeEntry               (per task, per user)
Notification
File                    (metadata; actual files in R2)
Company
Contact
StatusWorkflow
SlaRule
```

---

## Marketing Site

Separate project from the application. Not part of this codebase.

---

## Future Features

Deferred from all phases — to be evaluated later:

- Keyboard shortcuts
- OAuth providers (Google, GitHub, Microsoft)
- Push notifications (browser/mobile)
- Slack integration
- Mobile-optimized UI (bottom tab bar, swipe gestures)
- Guest role (view-only, for clients)
- Per-project permissions
- SAML/SSO (enterprise)
- Collaborative editing (cursor presence, real-time co-editing)
- Webhooks and API for third-party integrations
