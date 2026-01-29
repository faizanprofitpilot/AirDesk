# AirDesk Refactor Summary

## Overview
Successfully refactored from law firm intake system into AirDesk (HVAC phone receptionist). The codebase now focuses on HVAC service calls with email ticket delivery.

## Files Changed

### Core Product Identity
- `package.json` - Changed name to "airdesk"
- `app/layout.tsx` - Updated metadata (title, description)
- `app/page.tsx` - Complete landing page rewrite for HVAC positioning
- `README.md` - Updated documentation for AirDesk
- `app/(auth)/login/page.tsx` - Updated logo alt text
- `components/app-sidebar.tsx` - Updated logo alt text

### Data Model & Types
- `types/index.ts` - Updated IntakeData interface with HVAC fields:
  - `callerName`, `callerPhone`, `addressLine1`, `city`, `state`
  - `issueCategory` (No heat, No cool, Furnace, AC, etc.)
  - `issueDescription`, `urgency`, `requestedWindow`
  - `nextAvailableOffered`, `serviceFeeMentioned`, `notes`
- `types/index.ts` - Updated Firm interface with HVAC settings:
  - `agent_name`, `cc_emails`, `business_hours_open`, `business_hours_close`
  - `after_hours_handling`, `default_next_available_slot`
  - `service_call_fee`, `service_fee_enabled`, `send_incomplete_tickets`
- `types/index.ts` - Updated ConversationState for HVAC flow

### Agent & Prompts
- `lib/agent/prompts.ts` - Complete rewrite for HVAC qualification flow
- `lib/vapi/agent.ts` - Updated buildVapiAgent() with HVAC parameters
- Updated all `buildVapiAgent()` calls in:
  - `app/api/vapi/provision-number/route.ts`
  - `app/api/vapi/update-assistant/route.ts`
  - `app/api/vapi/link-number/route.ts`
  - `app/api/telephony/provision/route.ts`

### Email Ticketing
- `lib/clients/resend.ts` - Complete rewrite for HVAC tickets:
  - Ticket ID format: `HVAC-YYYY-MMDD-####`
  - Priority determination (URGENT vs NORMAL)
  - Status determination (NEW vs INCOMPLETE)
  - HVAC-specific email template with structured fields
- `lib/utils/summarize.ts` - Updated for HVAC service call summaries
- `lib/intake/processor.ts` - Updated to pass HVAC-specific email parameters

### Admin UI
- `components/SettingsForm.tsx` - Added all HVAC configuration fields:
  - Business name (renamed from "Firm name")
  - Agent name
  - Notification emails
  - CC emails (optional)
  - Business hours (open/close time)
  - After-hours handling toggle
  - Default "next available" slot text
  - Service call fee amount
  - Service fee enabled toggle
  - Send incomplete tickets toggle
  - Test Email Ticket button
- `app/settings/page.tsx` - Updated page title/description
- `app/dashboard/page.tsx` - Updated terminology (firm → business)

### Test Endpoints
- `app/api/test-intake-email/route.ts` - Updated to send HVAC sample tickets

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Vapi
VAPI_API_KEY=your_vapi_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema Updates Needed

The following fields need to be added to the `firms` table in Supabase:

```sql
ALTER TABLE firms
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS cc_emails TEXT[],
ADD COLUMN IF NOT EXISTS business_hours_open TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS business_hours_close TEXT DEFAULT '17:00',
ADD COLUMN IF NOT EXISTS after_hours_handling TEXT DEFAULT 'collect_scheduling',
ADD COLUMN IF NOT EXISTS default_next_available_slot TEXT DEFAULT 'Tomorrow morning at 8:00 a.m.',
ADD COLUMN IF NOT EXISTS service_call_fee NUMERIC DEFAULT 99,
ADD COLUMN IF NOT EXISTS service_fee_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS send_incomplete_tickets BOOLEAN DEFAULT false;
```

## Quick Test Plan

### 1. Place Test Call
- Provision a phone number via dashboard
- Call the number
- Complete the HVAC qualification conversation:
  - Issue: "No heat" or "No cool"
  - Urgency: "ASAP"
  - Name, phone, address
  - Scheduling preference
- Verify call appears in dashboard

### 2. Verify Email Ticket
- Check notification email inbox
- Verify ticket format:
  - Subject: `[NEW HVAC LEAD] {Issue} – {City} – {Requested Time}`
  - Ticket ID: `HVAC-YYYY-MMDD-####`
  - Priority: URGENT or NORMAL
  - All fields populated correctly

### 3. Test Settings
- Toggle pricing enabled/disabled
- Update default "next available" slot text
- Verify agent uses new text in next call
- Toggle send incomplete tickets
- Test "Send Test Ticket" button

### 4. Test Priority Logic
- Call with "no heat" + "ASAP" → Should be URGENT
- Call with "AC not working" + "can wait" → Should be NORMAL
- Verify priority in email ticket

## Key Features Implemented

✅ 24/7 inbound call answering (Vapi)
✅ HVAC qualification flow:
   - Caller name
   - Callback number (with caller ID confirmation)
   - Service address (street + city, state optional)
   - Issue category (No heat / No cool / Furnace / AC / Thermostat / Strange noise / Leak / Other)
   - Urgency signal (ASAP vs can wait)
   - Requested appointment window
   - Service call fee (if pricing enabled and asked)
✅ Scheduling behavior:
   - Offers configurable default slot for "next available"
   - Captures preferred day/time window
   - Always says "team will call/text shortly to confirm"
✅ Email ticket after call:
   - Subject: `[NEW HVAC LEAD] {Issue} – {City} – {Requested Time}`
   - Ticket ID format: `HVAC-YYYY-MMDD-####`
   - Priority: URGENT or NORMAL
   - Status: NEW or INCOMPLETE
   - Structured fields + recording link + transcript excerpt
   - Sends to notification emails + optional CC list
   - Optional incomplete ticket toggle
✅ Admin config page:
   - Business name
   - Agent name
   - Notification emails (comma-separated, validated)
   - CC emails (optional)
   - Business hours (open/close time + timezone)
   - After-hours handling toggle
   - Default "next available" slot text
   - Service call fee amount + pricing enabled toggle
   - Send incomplete tickets toggle
   - Test Email Ticket button

## Notes

- Legacy fields in IntakeData are kept for backward compatibility during migration
- Database schema uses `firm_name` field name (kept for compatibility) but UI shows "Business Name"
- All agent prompts and email templates are now HVAC-specific
- No calendar integration - scheduling is preference capture only
- No CRM integrations - output is email tickets only

## Next Steps

1. Run database migration to add new fields
2. Configure environment variables
3. Test end-to-end flow: call → capture → email
4. Update any remaining documentation files if needed
5. Deploy to production
