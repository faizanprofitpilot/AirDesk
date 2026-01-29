'use client';

import { Call, IntakeData, SummaryData } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, ChevronUp, Play, Phone, MapPin, Wrench, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CallDetail from './CallDetail';

interface CallTranscriptProps {
  call: Call;
}

export default function CallTranscript({ call }: CallTranscriptProps) {
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const intake = (call.intake_json as IntakeData) || {};
  const summary = (call.summary_json as SummaryData) || null;

  const getUrgencyValue = (urgency: string): number => {
    switch (urgency) {
      case 'ASAP':
      case 'emergency_redirected':
        return 5;
      case 'high':
        return 4;
      default:
        return 1;
    }
  };

  const getUrgencyColor = (urgency: string): string => {
    const value = getUrgencyValue(urgency);
    if (value >= 4) return '#DC2626';
    if (value >= 3) return '#F59E0B';
    return '#059669';
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
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const parseTranscript = (transcript: string | null): Array<{ role: 'assistant' | 'user'; content: string }> => {
    if (!transcript) return [];
    
    const lines = transcript.split('\n').filter(line => line.trim());
    const turns: Array<{ role: 'assistant' | 'user'; content: string }> = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.toLowerCase().includes('ai') || trimmed.toLowerCase().includes('assistant') || trimmed.toLowerCase().includes('receptionist')) {
        turns.push({ role: 'assistant', content: trimmed });
      } else if (trimmed.toLowerCase().includes('caller') || trimmed.toLowerCase().includes('user') || trimmed.toLowerCase().includes('customer')) {
        turns.push({ role: 'user', content: trimmed });
      } else {
        turns.push({ role: 'user', content: trimmed });
      }
    }
    
    return turns.length > 0 ? turns : [{ role: 'assistant', content: transcript }];
  };

  const transcriptTurns = parseTranscript(call.transcript_text);
  const urgency = intake?.urgency || call.urgency || 'normal';
  const urgencyValue = getUrgencyValue(urgency);
  const urgencyColor = getUrgencyColor(urgency);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] p-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/calls')}
            className="flex items-center gap-2 text-sm font-medium text-[#1E40AF] hover:text-[#1E3A8A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Service Calls
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              call.status === 'emailed' 
                ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20' 
                : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
            }`}>
              {call.status === 'emailed' ? 'Ticket Sent' : call.status}
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#1F2937] mb-1">
          Service Call Details
        </h1>
        <p className="text-sm text-[#475569]">
          Review customer information and call details
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <CallDetail call={call} />

        {/* Full Transcript (Collapsible) */}
        {call.transcript_text && (
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
            <button
              onClick={() => setTranscriptOpen(!transcriptOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F1F5F9] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1F2937]">Full Call Transcript</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[#059669]/10 text-[#059669]">Available</span>
              </div>
              {transcriptOpen ? <ChevronUp className="w-5 h-5 text-[#475569]" /> : <ChevronDown className="w-5 h-5 text-[#475569]" />}
            </button>
            {transcriptOpen && (
              <div className="p-6 border-t border-[#E2E8F0] bg-[#F1F5F9]">
                {transcriptTurns.length > 0 ? (
                  <div className="space-y-4">
                    {transcriptTurns.map((turn, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold ${
                            turn.role === 'assistant' ? 'bg-[#1E40AF]' : 'bg-[#475569]'
                          }`}
                        >
                          {turn.role === 'assistant' ? 'AI' : 'C'}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold mb-1 text-[#475569]">
                            {turn.role === 'assistant' ? 'AI Receptionist' : 'Customer'}
                          </div>
                          <div className="text-sm leading-relaxed text-[#1F2937]">
                            {turn.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg p-4 bg-white border border-[#E2E8F0]">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#1F2937] font-mono">
                      {call.transcript_text}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
