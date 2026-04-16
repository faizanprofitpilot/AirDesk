import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/clients/supabase';
import { normalizeAppUrl } from '@/lib/clients/twilio';
import twilio from 'twilio';

export const runtime = 'nodejs';

/**
 * Update webhook URLs for existing Twilio phone numbers
 * This ensures all Twilio numbers use the production webhook URLs
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firmId } = await req.json();

    if (!firmId) {
      return NextResponse.json({ error: 'Missing firmId' }, { status: 400 });
    }

    // Verify user owns the firm
    const { data: firmData, error: firmError } = await supabase
      .from('firms')
      .select('id, firm_name, twilio_number, owner_user_id')
      .eq('id', firmId)
      .single();

    if (firmError || !firmData) {
      console.error('[Update Twilio Webhooks] Firm lookup error:', firmError);
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }

    if ((firmData as any).owner_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firm = firmData as any;

    if (!firm.twilio_number) {
      return NextResponse.json({ 
        error: 'No Twilio number found',
        message: 'This firm does not have a Twilio number configured'
      }, { status: 400 });
    }

    // Validate Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
      return NextResponse.json({ 
        error: 'Twilio credentials not configured' 
      }, { status: 500 });
    }

    // Get app URL for webhook configuration
    const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
    if (!appUrl) {
      return NextResponse.json({ 
        error: 'NEXT_PUBLIC_APP_URL not configured' 
      }, { status: 500 });
    }

    const voiceUrl = `${appUrl}/api/twilio/voice`;
    const statusUrl = `${appUrl}/api/twilio/status`;

    console.log('[Update Twilio Webhooks] Updating webhooks for:', firm.twilio_number);
    console.log('[Update Twilio Webhooks] Voice URL:', voiceUrl);
    console.log('[Update Twilio Webhooks] Status URL:', statusUrl);

    // Initialize Twilio client
    const twilioClient = twilio(accountSid, authToken);

    // Find the phone number in Twilio account
    const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber: firm.twilio_number,
      limit: 1,
    });

    if (incomingNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'Phone number not found in Twilio account',
        message: `Number ${firm.twilio_number} not found in your Twilio account`
      }, { status: 404 });
    }

    // Update webhooks
    try {
      await twilioClient.incomingPhoneNumbers(incomingNumbers[0].sid).update({
        voiceUrl: voiceUrl,
        voiceMethod: 'POST',
        statusCallback: statusUrl,
        statusCallbackMethod: 'POST',
      });

      console.log('[Update Twilio Webhooks] ✅ Webhooks updated successfully');

      return NextResponse.json({
        success: true,
        message: 'Twilio webhook URLs updated successfully',
        phoneNumber: firm.twilio_number,
        voiceUrl,
        statusUrl,
      });
    } catch (twilioError: any) {
      console.error('[Update Twilio Webhooks] Error updating webhooks:', twilioError);
      return NextResponse.json({
        error: 'Failed to update Twilio webhooks',
        details: twilioError?.message || 'Unknown error',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Update Twilio Webhooks] Unexpected error:', error);
    return NextResponse.json({
      error: error?.message || 'Internal server error',
    }, { status: 500 });
  }
}
