import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import CallsList from '@/components/CallsList';
import DateFilter from '@/components/DateFilter';
import Link from 'next/link';
import { Phone, Filter, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Helper function to get date range from searchParams
function getDateRange(searchParams: { period?: string; start?: string; end?: string }) {
  // Default to 'all' if no period is specified (show all calls)
  const period = searchParams.period || 'all';
  
  if (period === 'all') {
    return null; // No date filter
  }

  // Custom dates or if start/end are provided directly
  if (searchParams.period === 'custom' || (searchParams.start && searchParams.end)) {
    if (searchParams.start && searchParams.end) {
      return {
        start: new Date(searchParams.start),
        end: new Date(searchParams.end),
      };
    }
    return null;
  }

  // Fallback: calculate from period
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    default:
      return null;
  }

  return { start, end };
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: { status?: string; urgency?: string; period?: string; start?: string; end?: string };
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

    // Get date range filter
    const dateRange = getDateRange(searchParams);

    // Build query - start with base query
    let query = supabase
      .from('calls')
      .select('*')
      .eq('firm_id', firm.id);

    // Apply status filter if provided
    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }

    // Apply date filter if provided (dateRange is null when period is 'all')
    if (dateRange) {
      query = query
        .gte('started_at', dateRange.start.toISOString())
        .lte('started_at', dateRange.end.toISOString());
    }

    // Always order by started_at descending
    query = query.order('started_at', { ascending: false });

    const { data: calls, error } = await query;

    if (error) {
      console.error('[CallsPage] Error fetching calls:', error);
      console.error('[CallsPage] Error details:', JSON.stringify(error, null, 2));
    }

    const callsList = (calls || []) as any[];
    
    // Debug in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[CallsPage Debug]', {
        firmId: firm.id,
        dateRange,
        period: searchParams.period,
        status: searchParams.status,
        callsCount: callsList.length,
        hasError: !!error,
        firstCall: callsList[0] ? { id: callsList[0].id, started_at: callsList[0].started_at } : null
      });
    }

    return (
      <PlatformLayout>
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#F1F5F9] via-white to-[#F1F5F9]">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] px-6 py-5 text-white shadow-lg">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                {/* Left Cluster: Title + Subtitle */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Phone className="w-5 h-5 text-white flex-shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold mb-0.5">Service Calls</h1>
                    <p className="text-sm text-blue-100/90">
                      View and manage all incoming HVAC service calls gracefully
                    </p>
                  </div>
                </div>

                {/* Right Cluster: Stats + Action */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Inline Stat Pills */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
                      <span className="text-sm font-medium">Total Calls:</span>
                      <span className="text-sm font-bold">{callsList.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Mail className="w-3.5 h-3.5 text-white/80" />
                      <span className="text-sm font-medium">Dispatched:</span>
                      <span className="text-sm font-bold">{callsList.filter((c: any) => c.status === 'emailed').length}</span>
                    </div>
                  </div>

                  {/* Secondary Action */}
                  <Link
                    href="/dashboard"
                    className="px-3 py-1.5 text-sm font-medium text-white/90 hover:text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    View Dispatch Board →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-[#475569]" />
                  <span className="text-sm font-medium text-[#475569]">Filter by date:</span>
                </div>
                <DateFilter />
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
