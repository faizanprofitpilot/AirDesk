import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TicketStatus = 'READY' | 'DISPATCHED' | 'COMPLETED';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['READY', 'DISPATCHED', 'COMPLETED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be READY, DISPATCHED, or COMPLETED' },
        { status: 400 }
      );
    }

    // Verify user owns the firm that owns this call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('firm_id')
      .eq('id', id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const callData = call as any;
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('owner_user_id')
      .eq('id', callData.firm_id)
      .single();

    const firmData = firm as any;
    if (firmError || !firmData || firmData.owner_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update ticket status
    const { error: updateError } = await supabase
      .from('calls')
      // @ts-ignore - ticket_status column added via migration, not yet in generated types
      .update({ ticket_status: status })
      .eq('id', id);

    if (updateError) {
      console.error('[Update Ticket Status] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ticket status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('[Update Ticket Status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
