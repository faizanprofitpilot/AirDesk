# Dispatch Board Implementation

## Overview
A Kanban-style Dispatch Board has been added to the Dashboard, allowing HVAC businesses to visually manage service call tickets through a drag-and-drop workflow.

## What Was Implemented

### 1. Database Schema
- **File**: `sql/add_ticket_status.sql`
- Added `ticket_status` column to `calls` table
- Values: `READY`, `DISPATCHED`, `COMPLETED`
- Default: `READY` (or `DISPATCHED` if call status is `emailed`)
- Index created for performance

### 2. Components Created

#### `components/DispatchBoard.tsx`
- Main Kanban board component with 3 columns
- Drag-and-drop functionality using @dnd-kit
- Sorting: URGENT first, then newest
- Responsive grid layout (3 columns desktop, stacks on mobile)

#### `components/TicketCard.tsx`
- Individual ticket card display
- Priority pill (URGENT = orange, NORMAL = blue)
- Call and Map action buttons
- Mobile menu for status changes (when drag not available)

#### `components/DispatchBoardClient.tsx`
- Client wrapper that handles state and API calls
- Optimistic UI updates
- Toast notifications for success/error

### 3. API Route
- **File**: `app/api/tickets/[id]/status/route.ts`
- PATCH endpoint to update ticket status
- Validates authentication and ownership
- Returns success/error responses

### 4. Dashboard Integration
- **File**: `app/dashboard/page.tsx`
- Fetches all calls with intake data
- Transforms calls to Ticket format
- Renders DispatchBoardClient component
- Positioned after metric cards

### 5. Utilities
- **File**: `lib/utils/toast.ts`
- Simple toast notification system
- Success and error toasts

## Setup Instructions

### 1. Run SQL Migration
Execute the SQL migration in your Supabase SQL Editor:
```sql
-- Run: sql/add_ticket_status.sql
```

### 2. Install Dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 3. Verify
1. Start the dev server: `npm run dev`
2. Navigate to Dashboard
3. You should see the Dispatch Board below the metric cards
4. Try dragging a ticket between columns
5. On mobile, use the menu (three dots) to change status

## Features

### Desktop
- ✅ Drag-and-drop tickets between columns
- ✅ Visual feedback during drag
- ✅ Optimistic updates
- ✅ Toast notifications

### Mobile
- ✅ Tap-to-move menu (three dots icon)
- ✅ Responsive layout (stacks columns)
- ✅ Touch-friendly buttons

### Ticket Display
- ✅ Priority badges (URGENT/NORMAL)
- ✅ Caller name and location
- ✅ Issue category
- ✅ Requested time window
- ✅ Call button (tel: link)
- ✅ Map button (Google Maps link)

### Sorting
- ✅ URGENT tickets appear first
- ✅ Then sorted by newest first
- ✅ Within each column

## Data Model

Tickets are derived from `calls` table:
- `ticket_status`: READY | DISPATCHED | COMPLETED
- Priority calculated from:
  - Issue category (No heat/No cool) + urgency (ASAP) = URGENT
  - Otherwise NORMAL
- All ticket data comes from `intake_json` field

## Edge Cases Handled
- Missing caller name → "Unknown caller"
- Missing address → Map button hidden
- Missing phone → Call button hidden
- Missing requested time → "Scheduling TBD"
- Mobile devices → Menu fallback instead of drag

## Notes
- Only calls with `intake_json` data are shown (qualified leads)
- Default status for new calls: `READY`
- Status persists after page refresh
- No technician assignment (as per requirements)
- No calendar integration (as per requirements)
- No CRM integrations (as per requirements)
