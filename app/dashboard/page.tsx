import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PhoneNumberGenerate from '@/components/PhoneNumberProvision';
import UsageDisplay from '@/components/UsageDisplay';
import DispatchBoardClient from '@/components/DispatchBoardClient';
import DateFilter from '@/components/DateFilter';
import { Phone, TrendingUp, Clock, AlertTriangle, CheckCircle2, Mail, Wrench, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Ticket } from '@/components/DispatchBoard';

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: { period?: string; start?: string; end?: string };
}

// Helper function to get date range from searchParams
function getDateRange(searchParams: { period?: string; start?: string; end?: string }) {
  if (!searchParams.period || searchParams.period === 'all') {
    return null; // No date filter
  }

  if (searchParams.start && searchParams.end) {
    return {
      start: new Date(searchParams.start),
      end: new Date(searchParams.end),
    };
  }

  // Fallback: calculate from period
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (searchParams.period) {
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: firmData, error: firmError } = await supabase
    .from('firms')
    .select('*')
    .eq('owner_user_id', session.user.id)
    .limit(1)
    .maybeSingle();

  if (firmError && firmError.code !== 'PGRST116') {
    console.error('[Dashboard] Error fetching firm:', firmError);
    return (
      <PlatformLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>Error loading business data. Please try refreshing the page.</p>
          </div>
        </div>
      </PlatformLayout>
    );
  }

  const firm = firmData || null;

  // Get date range filter
  const dateRange = getDateRange(searchParams);

  // Helper to apply date filter to a query
  const applyDateFilter = (query: any) => {
    if (dateRange) {
      return query
        .gte('started_at', dateRange.start.toISOString())
        .lte('started_at', dateRange.end.toISOString());
    }
    return query;
  };

  const { count: callsCount } = firm
    ? await applyDateFilter(
        supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('firm_id', (firm as any).id)
      )
    : { count: 0 };

  let leadsCount = 0;
  if (firm) {
    try {
      let query = supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', (firm as any).id)
        .or('intake_json->>callerName.not.is.null,intake_json->>full_name.not.is.null');
      
      query = applyDateFilter(query);
      const { count, error } = await query;
      
      if (error) {
        let allCallsQuery = supabase
          .from('calls')
          .select('intake_json, started_at')
          .eq('firm_id', (firm as any).id);
        
        allCallsQuery = applyDateFilter(allCallsQuery);
        const { data: allCalls } = await allCallsQuery;
        
        leadsCount = (allCalls || []).filter((call: any) => {
          const intake = call.intake_json as any;
          return (intake?.callerName && intake.callerName.trim().length > 0) ||
                 (intake?.full_name && intake.full_name.trim().length > 0);
        }).length;
      } else {
        leadsCount = count || 0;
      }
    } catch (err) {
      let allCallsQuery = supabase
        .from('calls')
        .select('intake_json, started_at')
        .eq('firm_id', (firm as any).id);
      
      allCallsQuery = applyDateFilter(allCallsQuery);
      const { data: allCalls } = await allCallsQuery;
      
      leadsCount = (allCalls || []).filter((call: any) => {
        const intake = call.intake_json as any;
        return intake?.callerName && intake.callerName.trim().length > 0;
      }).length;
    }
  }

  let urgentCallsCount = 0;
  if (firm) {
    let query = supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', (firm as any).id)
      .or('intake_json->>urgency.eq.ASAP,intake_json->>issueCategory.eq.No heat,intake_json->>issueCategory.eq.No cool');
    
    query = applyDateFilter(query);
    const { count } = await query;
    urgentCallsCount = count || 0;
  }

  const { count: emailedCount } = firm
    ? await applyDateFilter(
        supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('firm_id', (firm as any).id)
          .eq('status', 'emailed')
      )
    : { count: 0 };

  const { data: recentCallsData } = firm
    ? await applyDateFilter(
        supabase
          .from('calls')
          .select('*')
          .eq('firm_id', (firm as any).id)
          .order('started_at', { ascending: false })
          .limit(5)
      )
    : { data: null };

  const recentCalls = (recentCallsData || []) as any[];

  // Fetch all calls for Dispatch Board
  // Show calls that have transcripts OR intake_json (covers both finalized and in-progress calls with data)
  const { data: allCallsData } = firm
    ? await applyDateFilter(
        supabase
          .from('calls')
          .select('*')
          .eq('firm_id', (firm as any).id)
          .or('transcript_text.not.is.null,intake_json.not.is.null') // Show calls with transcripts or intake data
          .order('started_at', { ascending: false })
      )
    : { data: null };

  // Transform calls to tickets
  const tickets: Ticket[] = ((allCallsData || []) as any[]).map((call: any) => {
    const intake = call.intake_json as any;
    
    // Extract from transcript if intake_json is missing or incomplete
    let callerName = intake?.callerName || intake?.full_name;
    let callerPhone = intake?.callerPhone || intake?.callback_number || call.from_number;
    let issueCategory = intake?.issueCategory;
    let issueDescription = intake?.issueDescription || intake?.reason_for_call;
    let addressLine1 = intake?.addressLine1;
    let city = intake?.city;
    let state = intake?.state;
    let urgency = intake?.urgency || call.urgency || 'normal';
    
    // Fallback: Extract from transcript if intake data is missing
    // Also use from_number as caller phone if available
    if (!callerPhone && call.from_number) {
      callerPhone = call.from_number;
    }
    
    if (call.transcript_text && (!callerName || !issueDescription)) {
      const transcript = call.transcript_text;
      
      // Extract name from transcript
      if (!callerName) {
        const nameMatch = transcript.match(/(?:my name is|i'm|this is|i am|name is)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$|\n)/i);
        if (nameMatch && nameMatch[1]) {
          callerName = nameMatch[1].trim();
        }
      }
      
      // Extract issue from transcript
      if (!issueDescription && !issueCategory) {
        const issueMatch = transcript.match(/(?:furnace|heater|ac|air conditioner|thermostat|hvac|heat|cool)[^.\n]*(?:is|not|won't|doesn't|isn't)[^.\n]*/i);
        if (issueMatch) {
          issueDescription = issueMatch[0].trim();
        } else {
          // Try simpler pattern
          const simpleMatch = transcript.match(/(?:issue|problem|what's wrong)[:\s]+([^.\n]+)/i);
          if (simpleMatch && simpleMatch[1]) {
            issueDescription = simpleMatch[1].trim();
          }
        }
      }
      
      // Extract address from transcript
      if (!addressLine1) {
        const addressMatch = transcript.match(/(\d+\s+[A-Z][A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl)[^,]*)/i);
        if (addressMatch && addressMatch[1]) {
          addressLine1 = addressMatch[1].trim();
        }
      }
    }
    
    // Default values if still missing
    issueCategory = issueCategory || 'Not specified';
    callerName = callerName || 'Unknown caller';
    
    // Determine priority: URGENT if no heat/cool + ASAP, or if urgency is high/ASAP
    const priority: 'URGENT' | 'NORMAL' = 
      ((issueCategory === 'No heat' || issueCategory === 'No cool') && urgency === 'ASAP') ||
      urgency === 'ASAP' || urgency === 'high'
        ? 'URGENT'
        : 'NORMAL';

    // Get ticket_status from call, default to READY if not set or invalid
    // Ensure it's one of the valid statuses
    let ticketStatus = call.ticket_status || 'READY';
    if (ticketStatus !== 'READY' && ticketStatus !== 'DISPATCHED' && ticketStatus !== 'COMPLETED') {
      ticketStatus = 'READY';
    }
    const validTicketStatus = ticketStatus as Ticket['status'];

    return {
      id: call.id,
      status: validTicketStatus,
      priority,
      issueCategory,
      issueDescription: issueDescription,
      callerName: callerName,
      callerPhone: callerPhone,
      city: city,
      state: state,
      addressLine1: addressLine1,
      requestedWindow: intake?.requestedWindow || (urgency === 'ASAP' ? 'ASAP' : undefined),
      createdAt: call.started_at,
      recordingUrl: call.recording_url,
      transcriptSnippet: call.transcript_text?.substring(0, 200),
    };
  });

  return (
    <PlatformLayout>
      <div className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-[#F1F5F9] via-white to-[#F1F5F9]">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero Header Section */}
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">HVAC Service Command Center</h1>
                <p className="text-base text-blue-100">
                  Real-time monitoring of your service calls, leads, and dispatch tickets
                </p>
              </div>
              {firm && (
                <div className="bg-white rounded-xl p-4 shadow-lg flex-shrink-0">
                  <PhoneNumberGenerate firm={firm} />
                </div>
              )}
            </div>
          </div>

          {!firm ? (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-[#E2E8F0] p-10">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#1F2937] mb-2">
                    Setup Required
                  </h2>
                  <p className="text-[#475569] mb-6 text-lg">
                    Configure your HVAC business settings to start receiving service calls 24/7. Your AI receptionist is ready to answer calls once you complete setup.
                  </p>
                  <Button 
                    asChild
                    className="h-12 px-8 rounded-xl font-semibold text-base bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] hover:from-[#1E3A8A] hover:to-[#1E40AF] text-white shadow-lg"
                  >
                    <Link href="/settings">Start Setup →</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Date Filter */}
              <div className="flex items-center justify-end">
                <DateFilter />
              </div>

              {/* Key Performance Metrics */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center shadow-lg">
                      <Phone className="w-7 h-7 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div className="text-4xl font-bold text-[#1F2937] mb-2">
                    {callsCount || 0}
                  </div>
                  <div className="text-sm font-semibold text-[#475569] uppercase tracking-wide">
                    Total Calls
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-2">All inbound service calls</div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div className="text-4xl font-bold text-[#1F2937] mb-2">
                    {leadsCount || 0}
                  </div>
                  <div className="text-sm font-semibold text-[#475569] uppercase tracking-wide">
                    Qualified Leads
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-2">Ready to dispatch</div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F97316] to-[#FB923C] flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-7 h-7 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <div className="text-4xl font-bold text-[#1F2937] mb-2">
                    {urgentCallsCount || 0}
                  </div>
                  <div className="text-sm font-semibold text-[#475569] uppercase tracking-wide">
                    Urgent Requests
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-2">No heat/cool emergencies</div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center shadow-lg">
                      <Mail className="w-7 h-7 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <div className="text-4xl font-bold text-[#1F2937] mb-2">
                    {emailedCount || 0}
                  </div>
                  <div className="text-sm font-semibold text-[#475569] uppercase tracking-wide">
                    Tickets Dispatched
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-2">Emailed to your team</div>
                </div>
              </div>

              {/* Dispatch Board */}
              {tickets.length > 0 && (
                <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] p-6">
                  <DispatchBoardClient initialTickets={tickets} firmId={(firm as any).id} />
                </div>
              )}

              {/* Usage Display */}
              {(firm as any).subscription_plan && (
                <UsageDisplay
                  firmId={(firm as any).id}
                  subscriptionPlan={(firm as any).subscription_plan}
                  subscriptionStatus={(firm as any).subscription_status}
                  subscriptionCurrentPeriodEnd={(firm as any).subscription_current_period_end}
                />
              )}

              {/* Business Quick Info */}
              <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#1F2937] mb-1">
                      Your HVAC Business
                    </h2>
                    <p className="text-sm text-[#475569]">
                      Quick access to your business configuration
                    </p>
                  </div>
                  <Button 
                    asChild 
                    variant="outline"
                    className="h-10 px-5 rounded-lg border-2 border-[#1E40AF] text-[#1E40AF] hover:bg-[#1E40AF] hover:text-white font-semibold"
                  >
                    <Link href="/settings">Configure</Link>
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 p-4 bg-[#F1F5F9] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-[#1E40AF]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#475569] mb-1">
                        Business Name
                      </div>
                      <div className="text-sm font-bold text-[#1F2937]">
                        {(firm as any).business_name || 'Not set'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F1F5F9] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#059669]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#475569] mb-1">
                        Notification Emails
                      </div>
                      <div className="text-sm font-bold text-[#1F2937]">
                        {(firm as any).notify_emails?.length || 0} configured
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F1F5F9] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[#1E40AF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#475569] mb-1">
                        Your AirDesk Phone Number
                      </div>
                      <div className="text-sm font-bold text-[#1F2937] truncate">
                        {(() => {
                          const phoneNumber = (firm as any)?.inbound_number_e164 
                            || (firm as any)?.vapi_phone_number 
                            || (firm as any)?.twilio_number;
                          
                          if (!phoneNumber) return 'Not set';
                          
                          // Format: +1 (555) 123-4567
                          const cleaned = phoneNumber.replace(/[^\d+]/g, '');
                          const match = cleaned.match(/^\+?1?(\d{3})(\d{3})(\d{4})$/);
                          if (match) {
                            return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
                          }
                          return phoneNumber;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Service Calls */}
              {recentCalls && recentCalls.length > 0 && (
                <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden">
                  <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1">
                          Recent Service Calls
                        </h2>
                        <p className="text-sm text-blue-100">
                          Latest customer calls and dispatch tickets
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <DateFilter className="[&_svg]:text-white/80 [&_div]:bg-white/10 [&_div]:border-white/20 [&_button]:text-white/80 [&_button:hover]:bg-white/20 [&_button:hover]:text-white" />
                        <Button 
                          asChild 
                          className="h-10 px-5 rounded-lg bg-white text-[#1E40AF] hover:bg-blue-50 font-semibold shadow-lg"
                        >
                          <Link href="/calls">View All Calls →</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {recentCalls.map((call) => {
                      const intake = call.intake_json as any;
                      
                      // Extract from intake_json first
                      let callerName = intake?.callerName || intake?.full_name;
                      let issueCategory = intake?.issueCategory;
                      let issueDescription = intake?.issueDescription || intake?.reason_for_call;
                      let addressLine1 = intake?.addressLine1;
                      let city = intake?.city;
                      let urgency = intake?.urgency || call.urgency || 'normal';
                      
                      // Fallback: Extract from transcript if intake data is missing
                      if (call.transcript_text && (!callerName || !issueDescription)) {
                        const transcript = call.transcript_text;
                        
                        // Extract name from transcript
                        if (!callerName) {
                          const nameMatch = transcript.match(/(?:my name is|i'm|this is|i am|name is)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$|\n)/i);
                          if (nameMatch && nameMatch[1]) {
                            const extractedName = nameMatch[1].trim();
                            // Filter out false positives
                            if (extractedName.length > 1 && 
                                !extractedName.toLowerCase().includes('receptionist') &&
                                !extractedName.toLowerCase().includes('assistant')) {
                              callerName = extractedName;
                            }
                          }
                        }
                        
                        // Extract issue from transcript
                        if (!issueDescription && !issueCategory) {
                          const issueMatch = transcript.match(/(?:furnace|heater|ac|air conditioner|thermostat|hvac|heat|cool)[^.\n]*(?:is|not|won't|doesn't|isn't)[^.\n]*/i);
                          if (issueMatch) {
                            issueDescription = issueMatch[0].trim();
                          } else {
                            // Try simpler pattern
                            const simpleMatch = transcript.match(/(?:issue|problem|what's wrong)[:\s]+([^.\n]+)/i);
                            if (simpleMatch && simpleMatch[1]) {
                              issueDescription = simpleMatch[1].trim();
                            }
                          }
                        }
                        
                        // Extract address from transcript
                        if (!addressLine1) {
                          const addressMatch = transcript.match(/(\d+\s+[A-Z][A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl)[^,]*)/i);
                          if (addressMatch && addressMatch[1]) {
                            addressLine1 = addressMatch[1].trim();
                          }
                        }
                      }
                      
                      // Default values
                      callerName = callerName || call.from_number || 'Unknown Customer';
                      issueCategory = issueCategory || (issueDescription ? 'Service Request' : 'Not specified');
                      const address = addressLine1 && city 
                        ? `${addressLine1}, ${city}` 
                        : addressLine1 
                        ? addressLine1 
                        : 'Address not provided';
                      
                      return (
                        <div key={call.id} className="p-6 hover:bg-[#F1F5F9] transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
                                  <Phone className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <div className="font-bold text-lg text-[#1F2937]">{callerName}</div>
                                    {call.status === 'emailed' && (
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#059669]/10 text-[#059669] text-xs font-semibold border border-[#059669]/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Ticket Sent
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-[#475569]">
                                    <div className="flex items-center gap-1.5">
                                      <Wrench className="w-4 h-4" />
                                      <span className="font-medium">{issueCategory}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-4 h-4" />
                                      <span>{address}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-[#94A3B8] ml-16">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(call.started_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {(urgency === 'ASAP' || issueCategory === 'No heat' || issueCategory === 'No cool') && (
                                <div className="px-3 py-1.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-xs font-bold border border-[#DC2626]/20">
                                  URGENT
                                </div>
                              )}
                              {call.status !== 'emailed' && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-semibold border border-[#F59E0B]/20">
                                  <Clock className="w-3 h-3" />
                                  {call.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PlatformLayout>
  );
}
