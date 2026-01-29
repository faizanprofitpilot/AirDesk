import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import CallsList from '@/components/CallsList';
import { Phone, Filter } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CallsPage({
  searchParams,
}: {
  searchParams: { status?: string; urgency?: string };
}) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      redirect('/login');
    }

    const { data: firmData, error: firmError } = await supabase
      .from('firms')
      .select('id')
      .eq('owner_user_id', session.user.id)
      .limit(1)
      .single();

    if (firmError || !firmData) {
      redirect('/settings');
    }

    const firm = firmData as any;

    let query = supabase
      .from('calls')
      .select('*')
      .eq('firm_id', firm.id)
      .order('started_at', { ascending: false });

    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
    }

    const callsList = calls || [];

    return (
      <PlatformLayout>
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#F1F5F9] via-white to-[#F1F5F9]">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] px-6 py-8 text-white shadow-lg">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Service Call Log</h1>
                  <p className="text-blue-100">
                    Complete history of all incoming HVAC service calls and dispatch tickets
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
                  <div className="text-2xl font-bold leading-none">{callsList.length}</div>
                  <div className="text-xs text-blue-100 mt-1 font-semibold uppercase tracking-wide">Total Calls</div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
                  <div className="text-2xl font-bold leading-none">{callsList.filter((c: any) => c.status === 'emailed').length}</div>
                  <div className="text-xs text-blue-100 mt-1 font-semibold uppercase tracking-wide">Tickets Dispatched</div>
                </div>
              </div>
            </div>
          </div>

          {/* Calls List */}
          <div className="flex-1 overflow-auto">
            <CallsList calls={callsList} searchParams={searchParams} />
          </div>
        </div>
      </PlatformLayout>
    );
  } catch (error) {
    console.error('Error in CallsPage:', error);
    return (
      <PlatformLayout>
        <div className="flex-1 p-6">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
            <p className="text-sm text-[#475569]">
              Unable to load service calls. Please try again later.
            </p>
          </div>
        </div>
      </PlatformLayout>
    );
  }
}
