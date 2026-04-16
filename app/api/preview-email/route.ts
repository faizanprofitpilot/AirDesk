import { NextRequest, NextResponse } from 'next/server';
import { IntakeData, SummaryData } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Dev-only route to preview the email template in browser
 * GET /api/preview-email
 */
export async function GET(request: NextRequest) {
  // Sample HVAC intake data (same as test endpoint)
  const sampleIntake: IntakeData = {
    callerName: 'John Smith',
    callerPhone: '+15551234567',
    addressLine1: '123 Main Street',
    city: 'Chicago',
    state: 'IL',
    issueCategory: 'No heat',
    issueDescription: 'Furnace not working, no heat in the house',
    urgency: 'ASAP',
    requestedWindow: 'Tomorrow morning at 8:00 a.m.',
    nextAvailableOffered: true,
    serviceFeeMentioned: false,
    notes: 'Caller mentioned it\'s very cold and they have elderly parents at home',
  };

  const sampleSummary: SummaryData = {
    title: 'No Heat - John Smith - Chicago',
    summary_bullets: [
      'Caller: John Smith',
      'Phone: +1 (555) 123-4567',
      'Issue: No heat - Furnace not working',
      'Address: 123 Main Street, Chicago, IL',
      'Urgency: ASAP (elderly parents at home)',
      'Requested Time: Tomorrow morning at 8:00 a.m.',
    ],
    key_facts: {
      location: '123 Main Street, Chicago, IL',
    },
    action_items: [
      'Dispatch technician to service address',
      'Confirm appointment with caller',
      'Priority: High (no heat + elderly residents)',
    ],
    urgency_level: 'high',
    follow_up_recommendation: 'Dispatch technician ASAP due to no heat and elderly residents',
  };

  const sampleTranscript = `AI Receptionist: Thank you for calling ABC HVAC. This is Jessica. How can I help you with your HVAC needs today?

Caller: Hi, my furnace isn't working and I have no heat.

AI Receptionist: I understand. Is this something that needs attention ASAP, or can it wait?

Caller: ASAP please. It's very cold and I have elderly parents at home.

AI Receptionist: Got it. What's your name?

Caller: John Smith.

AI Receptionist: Thanks. What's the best number to reach you at?

Caller: 555-123-4567.

AI Receptionist: Thanks. What's the service address?

Caller: 123 Main Street, Chicago, Illinois.

AI Receptionist: When would you like us to come out? We have tomorrow morning at 8:00 a.m. available, or you can let me know your preference.

Caller: Tomorrow morning at 8:00 a.m. works.

AI Receptionist: Thank you. Our team will call or text you shortly to confirm the appointment. Have a great day!`;

  // Import the email generation logic
  // We'll need to extract the HTML generation part or call it directly
  // For now, let's create a simplified version that renders the email
  
  // Import sendIntakeEmail to get the HTML (we'll need to modify it to return HTML)
  // Actually, let's just render a preview version inline
  
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Preview - AirDesk</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .preview-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .preview-header {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 2px solid #E2E8F0;
        }
        .preview-header h1 {
          margin: 0;
          color: #1E40AF;
          font-size: 24px;
        }
        .preview-header p {
          margin: 8px 0 0 0;
          color: #475569;
          font-size: 14px;
        }
        iframe {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 4px;
          background: white;
        }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <div class="preview-header">
          <h1>📧 Email Template Preview</h1>
          <p>This is how the HVAC ticket email will appear to recipients. The email is optimized for Gmail, Outlook, and mobile clients.</p>
        </div>
        <iframe 
          srcdoc="
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset='utf-8'>
              <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            </head>
            <body style='margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;'>
              <!-- Email content will be loaded here -->
              <div style='padding: 20px; text-align: center; color: #94A3B8;'>
                Loading email preview...
              </div>
            </body>
            </html>
          "
          style="height: 800px;"
          title="Email Preview"
        ></iframe>
        <div style="margin-top: 20px; padding: 16px; background: #F1F5F9; border-radius: 4px; font-size: 13px; color: #475569;">
          <strong>Note:</strong> This is a static preview. To see the actual email with real data, use the test endpoint: <code>POST /api/test-intake-email?to=your@email.com</code>
        </div>
      </div>
      <script>
        // Load the actual email HTML via fetch
        fetch('/api/preview-email/html')
          .then(r => r.text())
          .then(html => {
            const iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.srcdoc = html;
            }
          })
          .catch(err => console.error('Failed to load email HTML:', err));
      </script>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
