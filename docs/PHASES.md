# Opchestra — Build Phases

## Phase 1: Core (MVP)

The foundation. A working task management app that a team can sign up for and start using.

### Auth & Accounts
- Email/password signup with email verification
- Login / logout / session management (NextAuth.js)
- Password reset flow
- Multi-workspace support with workspace switcher

### Workspaces
- Create workspace (name + URL slug)
- Workspace settings page
- Member management — invite by email, assign roles, remove members
- Admin-created user accounts (invite flow, set password on first login)

### Roles
- Four roles: Super Admin, Admin, Manager, Member
- Permission enforcement across all API routes and UI

### Tasks
- All built-in fields: title, description, status, priority, assignee, startDate, endDate, labels, project, parentTaskId, timeEstimate, isMilestone, completedAt, createdAt, updatedAt, lastActivityAt
- Sub-tasks with 4-level depth enforcement
- Dependencies (task-to-task with type FS/SS/FF/SF and mode strict/flexible)
- Task age tracking (computed from createdAt, stale threshold setting)
- File attachments (upload to Cloudflare R2 via presigned URLs)

### Rich Text Editor
- Tiptap integration for task descriptions
- All block types: headings, lists, checklists, code blocks, blockquotes, dividers, images, file attachments
- @user mentions with autocomplete and notification trigger

### Projects
- CRUD for projects (name, description, status)
- Assign tasks to projects
- Default view per project

### Views
- Table view (spreadsheet-style, sortable columns, groupable rows)
- List view (compact, minimal)
- "My Tasks" auto-generated personal view

### Task Detail Panel
- Slide-over panel from right side
- Three tabs: Details, Activity, Time Log (time log empty until Phase 2)
- Inline-editable fields
- Comments with @mentions
- Activity feed (status changes, assignments, comments)
- Sub-tasks section
- Dependencies section
- Files section

### Navigation
- Sidebar with: Home, My Tasks, Projects (expandable), Views, Settings, Members
- Collapsible sidebar
- Responsive hamburger menu on small screens

### Search
- Global search bar in top nav
- Full-text search across task titles and descriptions (PostgreSQL)

### Real-Time
- SSE for live updates across connected clients

### Dark Mode
- Tailwind dark: variants throughout
- System preference default, user override (Light / Dark / System)

### Responsive
- Layouts don't break on small screens
- Sidebar collapses, task detail goes full-screen, table scrolls horizontally

---

## Phase 2: Views, Notifications & Time Tracking

Richer ways to see tasks, stay informed, and track work hours.

### Views
- Kanban view (drag-and-drop cards, group by status or any single-select field)
- Calendar view (month/week/day grid, tasks plotted by dates)
- Saved views — personal and shared, with default view per project
- View configuration UI: filters (field + operator + value, AND/OR), sort (multi-level), group-by, column visibility and order

### Notifications
- In-app notification system (bell icon, unread count, dropdown, mark as read)
- Email notifications via Resend API
- All triggers: assigned, unassigned, status change, comment, @mention, watching, due date approaching
- User preferences: toggle per trigger, per channel
- Workspace-level stale task alerts

### Dashboard
- Home page redesign with widgets
- Activity & Upcoming widget: recent activity feed + upcoming deadlines, color-coded by urgency (overdue/today/upcoming), grouped by Today/Tomorrow/This Week
- My Tasks Summary: count by status
- Recent Projects: quick links

### Admin Settings
- Email integration config (Resend API key, from address, test connection)
- Encrypted credential storage in workspace settings table
- Workspace-level settings: ticket number prefix, stale threshold, default status workflow

### Time Tracking
- Start/stop timer on tasks
- Manual time entry (date + duration + notes)
- Billable toggle per entry
- Time Log tab on task detail panel (functional)
- Time Tracking sidebar section: personal and team-wide logged time views

---

## Phase 3: Project Management & Ticketing

Advanced project management tooling and full ticket management with CRM.

### Phase 3a: Project Management

#### Gantt View
- Timeline bars for each task (startDate to endDate)
- Dependency arrows (connectors between tasks)
- Milestones rendered as diamonds
- Drag to adjust dates
- Zoom levels (day, week, month)

#### Custom Fields
- All 17 field types: Text, Long Text, Number, Checkbox, Dropdown, Multi-select, Date, Hour, Person, URL, Email, Phone, Files, Rating, Currency, Formula, Location, Color
- Workspace-level field definitions
- Custom field values per task
- Fields visible in views (configurable per view)
- Limits: 20 free tier, 50 paid

#### Formula Engine
- Formula field type that computes values from other fields
- Support for: arithmetic, date math (DAYS, MONTHS between dates), conditionals (IF), string functions
- Recalculated on field change

### Phase 3b: Ticketing & CRM

#### Company & Contact Database
- Company CRUD: name, domain, industry, notes
- Contact CRUD: name, email, phone, title, company association, notes
- Auto-matching: inbound emails matched to contacts by email, contacts matched to companies by domain
- Sidebar section or dedicated page for CRM data

#### Ticket Management
- Tickets as tasks with additional fields: ticketNumber, source, contactId, companyId, slaResponseDue, slaResolutionDue
- Auto-incrementing ticket numbers with configurable prefix
- Ticket-specific status workflows (Open > In Progress > Waiting on Customer > Resolved > Closed)

#### Status Workflows
- Named status sets assignable to projects
- Each status has: name, color, category (todo/in_progress/done/closed)
- Default workflows: Task, Ticket
- Custom workflow creation

#### SLA Rules
- Per-priority response and resolution time targets
- Auto-calculated SLA due timestamps on ticket creation
- Visual SLA breach indicators
- SLA-based notifications (approaching breach, breached)

#### Email-to-Ticket Pipeline
- Inbound email processing at workspace-specific address
- Auto-detect ticket number in subject line — append to existing ticket
- Unknown emails placed in Ticket Inbox queue

#### Ticket Inbox
- Dedicated triage screen for Managers
- Actions per email: Assign as new ticket, Ignore, Merge with existing ticket
- Contact auto-creation from sender

#### Public Submission Form
- Shareable URL for external ticket submission (no login required)
- Fields: name, email, subject, description, file attachments
- Auto-creates Contact and queues ticket in inbox

---

## Phase 4: Business Modules

Revenue-generating features.

### Invoicing
- Generate invoices from billable time entries
- Group by project, client (company), or date range
- Invoice line items: description, hours, rate, amount
- Invoice status: draft, sent, paid, overdue
- PDF export
- Send invoice via email (Resend)

### Billing (Stripe Integration)
- Per-seat subscription model
- Free tier: up to 3 users per workspace
- Stripe Checkout for subscription signup
- Stripe Customer Portal for plan management
- Webhook handling for payment events (subscription created, updated, cancelled, payment failed)
- Seat count enforcement: block adding members beyond plan limit
- Usage tracking for storage limits (R2)

---

## Future Features (Unscheduled)

- Keyboard shortcuts
- OAuth providers (Google, GitHub, Microsoft)
- Push notifications (browser/mobile)
- Slack integration
- Mobile-optimized UI (bottom tab bar, swipe gestures)
- Guest role (view-only, for clients)
- Per-project permissions
- SAML/SSO (enterprise)
- Collaborative editing (cursor presence, real-time co-editing)
- Webhooks and public API for third-party integrations
- Workload view (team capacity visualization)
- Chart/Dashboard views (pie charts, bar charts, widgets)
