# Webhook Configuration Fix

## Problem
Your Vapi assistant's webhook URL is set to `http://localhost:3000/api/vapi/webhook`, which won't work in production. This is why calls aren't appearing in the platform and emails aren't being sent.

## Solution

### Step 1: Set Production URL
Make sure `NEXT_PUBLIC_APP_URL` is set in your production environment (Vercel, etc.):
```
NEXT_PUBLIC_APP_URL=https://www.getairdesk.xyz
```
(Replace with your actual production domain)

### Step 2: Update Assistant Webhook URL

**Option A: Use the Fix Endpoint (Recommended)**
1. Open your browser console on the Dashboard
2. Run this JavaScript:
```javascript
fetch('/api/vapi/fix-assistant-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firmId: 'YOUR_FIRM_ID' })
}).then(r => r.json()).then(console.log);
```
Replace `YOUR_FIRM_ID` with your actual firm ID (you can find it in the URL or database).

**Option B: Update via Vapi Dashboard**
1. Go to https://dashboard.vapi.ai/assistants
2. Find your assistant (search by name or ID)
3. Edit the assistant
4. Update the webhook URL to: `https://www.getairdesk.xyz/api/vapi/webhook`
5. Save

### Step 3: Verify
After updating, make a test call. The webhook should now reach your production server and:
- Create call records in the platform
- Send email tickets
- Process transcripts

## Debugging

If calls still don't appear after fixing the webhook URL:

1. **Check server logs** for webhook requests:
   - Look for `[Vapi Webhook]` log entries
   - Check for errors or warnings

2. **Verify webhook URL in Vapi**:
   - Go to Vapi Dashboard → Assistants → Your Assistant
   - Check the "Server URL" field
   - Should be: `https://www.getairdesk.xyz/api/vapi/webhook` (not localhost)

3. **Check environment variables**:
   - Ensure `NEXT_PUBLIC_APP_URL` is set correctly
   - Restart your server after setting it

4. **Test webhook manually**:
   ```bash
   curl -X POST https://www.getairdesk.xyz/api/vapi/webhook \
     -H "Content-Type: application/json" \
     -d '{"message":{"type":"status-update","status":"ended","call":{"id":"test"}}}'
   ```

## Common Issues

- **Webhook URL is localhost**: Assistant was created while running locally. Fix by updating webhook URL.
- **NEXT_PUBLIC_APP_URL not set**: Webhook URL defaults to localhost. Set the env var.
- **Webhook returns error**: Check server logs for the actual error message.
- **Calls appear but no email**: Check Resend API key and notification emails in settings.
