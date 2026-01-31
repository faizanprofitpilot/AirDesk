'use client';

import { useRouter } from 'next/navigation';
import { Call, CallStatus, UrgencyLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Phone, Clock, AlertCircle, CheckCircle2, Mail, Filter, Search } from 'lucide-react';
import { useState } from 'react';

interface CallsListProps {
  calls: Call[];
  searchParams: { status?: string; urgency?: string };
}

export default function CallsList({ calls, searchParams }: CallsListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState(searchParams.status || '');
  const [urgencyFilter, setUrgencyFilter] = useState(searchParams.urgency || '');

  const getStatusBadge = (status: CallStatus) => {
    switch (status) {
      case 'emailed':
        return {
          icon: CheckCircle2,
          label: 'Ticket Sent',
          className: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Error',
          className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20'
        };
      case 'in_progress':
      case 'transcribing':
      case 'summarizing':
        return {
          icon: Clock,
          label: 'Processing',
          className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
        };
      default:
        return {
          icon: Clock,
          label: status,
          className: 'bg-[#475569]/10 text-[#475569] border-[#475569]/20'
        };
    }
  };

  const getUrgencyBadge = (urgency: string | UrgencyLevel, issueCategory?: string) => {
    const isUrgent = urgency === 'ASAP' || urgency === 'high' || urgency === 'emergency_redirected' ||
                     issueCategory === 'No heat' || issueCategory === 'No cool';
    
    if (isUrgent) {
      return {
        label: 'URGENT',
        className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20'
      };
    }
    return {
      label: 'Normal',
      className: 'bg-[#475569]/10 text-[#475569] border-[#475569]/20'
    };
  };

  const formatDuration = (startedAt: string, endedAt: string | null): string => {
    if (!endedAt) return 'Ongoing';
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    
    if (isNaN(start) || isNaN(end) || end < start) {
      return 'N/A';
    }
    
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 0) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const callDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (callDate.getTime() === today.getTime()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (callDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getIssueCategory = (call: Call): string => {
    const intake = call.intake_json as any;
    return intake?.issueCategory || 'Not specified';
  };

  const handleFilter = () => {
    const newParams = new URLSearchParams();
    if (statusFilter) newParams.set('status', statusFilter);
    if (urgencyFilter) newParams.set('urgency', urgencyFilter);
    router.push(`/calls?${newParams.toString()}`);
  };

  // Ensure calls is an array
  const callsArray = Array.isArray(calls) ? calls : [];

  // Log to verify data is received
  if (typeof window !== 'undefined') {
    console.log('[CallsList Client]', {
      callsPropType: typeof calls,
      callsIsArray: Array.isArray(calls),
      callsArrayLength: callsArray.length,
      statusFilter,
      urgencyFilter,
      firstCall: callsArray[0] ? { id: callsArray[0].id, status: callsArray[0].status } : null
    });
  }

  const filteredCalls = callsArray.filter(call => {
    if (statusFilter && call.status !== statusFilter) {
      return false;
    }
    const intake = call.intake_json as any;
    const urgency = intake?.urgency || call.urgency || 'normal';
    if (urgencyFilter && urgency !== urgencyFilter) {
      return false;
    }
    return true;
  });

  // Log filtered results
  if (typeof window !== 'undefined') {
    console.log('[CallsList Client] Filtered:', {
      originalCount: callsArray.length,
      filteredCount: filteredCalls.length,
      statusFilter,
      urgencyFilter
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] mb-1">Service Calls</h1>
            <p className="text-sm text-[#475569]">
              View and manage all incoming HVAC service calls
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label 
              htmlFor="status" 
              className="block text-xs font-semibold uppercase tracking-wide mb-2 text-[#475569]"
            >
              Ticket Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="emailed">Ticket Sent</option>
              <option value="in_progress">In Progress</option>
              <option value="transcribing">Transcribing</option>
              <option value="summarizing">Summarizing</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label 
              htmlFor="urgency" 
              className="block text-xs font-semibold uppercase tracking-wide mb-2 text-[#475569]"
            >
              Urgency Level
            </label>
            <select
              id="urgency"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            >
              <option value="">All Urgency Levels</option>
              <option value="ASAP">Urgent (ASAP)</option>
              <option value="high">High Priority</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div>
            <Button 
              onClick={handleFilter}
              className="h-11 px-6 rounded-lg font-semibold text-sm bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-auto bg-[#F1F5F9] p-6">
        {filteredCalls.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
            <Phone className="w-12 h-12 text-[#475569] mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium text-[#475569] mb-1">No service calls found</p>
            <p className="text-xs text-[#475569] opacity-70">
              {callsArray.length === 0 ? 'No calls have been received yet.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCalls.map((call) => {
              const intake = call.intake_json as any;
              const callerName = intake?.callerName || call.from_number || 'Unknown';
              const issueCategory = getIssueCategory(call);
              const urgency = intake?.urgency || 'normal';
              const address = intake?.addressLine1 ? 
                `${intake.addressLine1}${intake.city ? `, ${intake.city}` : ''}` : 
                'Address not provided';
              const statusBadge = getStatusBadge(call.status);
              const urgencyBadge = getUrgencyBadge(urgency, issueCategory);
              const StatusIcon = statusBadge.icon;

              return (
                <div
                  key={call.id}
                  onClick={() => router.push(`/calls/${call.id}`)}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-6 hover:shadow-md hover:border-[#1E40AF] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-6 h-6 text-[#1E40AF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-[#1F2937] truncate">{callerName}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${urgencyBadge.className}`}>
                              {urgencyBadge.label}
                            </span>
                          </div>
                          <div className="text-sm text-[#475569] truncate">
                            {issueCategory} • {address}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-[#475569] ml-16">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(call.started_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>Duration: {formatDuration(call.started_at, call.ended_at)}</span>
                        </div>
                        {call.from_number && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{call.from_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {call.status === 'emailed' && (
                        <div className="w-8 h-8 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-[#059669]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
