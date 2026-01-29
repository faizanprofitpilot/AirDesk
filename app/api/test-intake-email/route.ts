import { NextRequest, NextResponse } from 'next/server';
import { sendIntakeEmail } from '@/lib/clients/resend';
import { IntakeData, SummaryData, UrgencyLevel } from '@/types';
import { createServerClient } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test endpoint to send a sample HVAC ticket email
 * Call: POST /api/test-intake-email
 * Uses current firm settings if authenticated, otherwise uses defaults
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let firm: any = null;
    if (session) {
      const { data: firmData } = await supabase
        .from('firms')
        .select('*')
        .eq('owner_user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      firm = firmData;
    }

    // Use firm's notification emails if available, otherwise require 'to' parameter
    const { searchParams } = new URL(request.url);
    const toParam = searchParams.get('to');
    const toEmails = firm?.notify_emails || (toParam ? [toParam] : null);

    if (!toEmails || toEmails.length === 0) {
      return NextResponse.json(
        { error: 'Missing notification emails. Configure in settings or use: /api/test-intake-email?to=your@email.com' },
        { status: 400 }
      );
    }

    console.log('[Test HVAC Email] Sending sample HVAC ticket email to:', toEmails);

    // Sample HVAC intake data
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

    // Sample summary data
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

    const sampleRecordingUrl = null; // No recording for test

    try {
      const emailResult = await sendIntakeEmail(
        toEmails,
        sampleIntake,
        sampleSummary,
        sampleTranscript,
        sampleRecordingUrl,
        'high' as UrgencyLevel,
        '+15551234567', // Caller phone
        firm?.send_incomplete_tickets || false, // Send incomplete toggle
        firm?.cc_emails || [], // CC emails
        'test-call-id-123', // Test call ID
        firm?.service_call_fee || 99 // Service call fee
      );

      console.log('[Test HVAC Email] Sample HVAC ticket email sent successfully:', emailResult);
      return NextResponse.json({
        success: true,
        message: 'Sample HVAC ticket email sent successfully',
        recipient: toEmails,
        cc: firm?.cc_emails || [],
        emailId: emailResult?.id || 'unknown',
        from: 'AirDesk <onboarding@resend.dev>',
        note: 'Check your inbox and spam folder. Emails from onboarding@resend.dev may go to spam.',
      });
    } catch (error) {
      console.error('[Test HVAC Email] Error sending email:', error);
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        {
          error: 'Failed to send sample HVAC ticket email',
          details: errorDetails,
          recipient: toEmails,
          hint: 'Check server logs for detailed error information. Verify RESEND_API_KEY is configured correctly.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Test HVAC Email] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
