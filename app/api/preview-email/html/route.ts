import { NextRequest, NextResponse } from 'next/server';
import { IntakeData, SummaryData } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Returns just the HTML of the email template for preview
 * GET /api/preview-email/html
 * 
 * Note: This is a simplified preview. For the actual email HTML,
 * the logic is in lib/clients/resend.ts sendIntakeEmail function.
 * To test the real email, use: POST /api/test-intake-email?to=your@email.com
 */
export async function GET(request: NextRequest) {
  // Redirect to test endpoint instructions
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Preview</title>
    </head>
    <body style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F1F5F9;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #1E40AF; margin: 0 0 16px 0;">📧 Email Preview</h1>
        <p style="color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
          The email template has been redesigned with a modern, dispatch-ready layout.
        </p>
        <div style="background: #F1F5F9; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #1F2937;">To preview the actual email:</p>
          <code style="display: block; background: white; padding: 12px; border-radius: 4px; color: #1E40AF; font-size: 13px;">
            POST /api/test-intake-email?to=your@email.com
          </code>
        </div>
        <div style="border-top: 1px solid #E2E8F0; padding-top: 24px;">
          <h2 style="color: #1F2937; font-size: 18px; margin: 0 0 12px 0;">New Email Features:</h2>
          <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
            <li>Modern 640px container with clean card design</li>
            <li>Priority and Status badges in header</li>
            <li>2x2 grid dispatch summary (Issue, Time, Address, Caller)</li>
            <li>Clickable phone (tel:) and address (Google Maps) links</li>
            <li>Action buttons: Call Customer, Open Ticket, Listen to Recording</li>
            <li>Compact details table (no duplicate summary section)</li>
            <li>De-emphasized transcript (first 12 lines only)</li>
            <li>Professional footer with compliance notice</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
