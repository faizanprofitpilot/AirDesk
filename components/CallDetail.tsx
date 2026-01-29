'use client';

import { Call, IntakeData, SummaryData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, Clock, AlertCircle, Wrench, Calendar } from 'lucide-react';

interface CallDetailProps {
  call: Call;
}

export default function CallDetail({ call }: CallDetailProps) {
  const intake = (call.intake_json as IntakeData) || {};
  const summary = (call.summary_json as SummaryData) || null;

  return (
    <div className="space-y-6">
      {/* Service Call Metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#1F2937] mb-1">
            Service Call Information
          </h2>
          <p className="text-sm text-[#475569]">
            Details about this HVAC service call
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-[#475569] mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Caller Number
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">{call.from_number}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#475569] mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Call Started
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">
                {new Date(call.started_at).toLocaleString()}
              </dd>
            </div>
          </div>
          {call.ended_at && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#475569] mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                  Call Ended
                </dt>
                <dd className="text-sm font-medium text-[#1F2937]">
                  {new Date(call.ended_at).toLocaleString()}
                </dd>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Status
              </dt>
              <dd className="text-sm font-medium text-[#1F2937] capitalize">{call.status}</dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Customer & Service Details */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#1F2937] mb-1">
            Customer & Service Details
          </h2>
          <p className="text-sm text-[#475569]">
            Information captured during the service call
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {(intake.callerName || intake.full_name) && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Customer Name
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">
                {intake.callerName || intake.full_name}
              </dd>
            </div>
          )}
          {(intake.callerPhone || intake.callback_number) && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Phone Number
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">
                {intake.callerPhone || intake.callback_number}
              </dd>
            </div>
          )}
          {intake.addressLine1 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Service Address
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">
                {intake.addressLine1}
                {intake.city && `, ${intake.city}`}
                {intake.state && `, ${intake.state}`}
              </dd>
            </div>
          )}
          {intake.issueCategory && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Issue Category
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">{intake.issueCategory}</dd>
            </div>
          )}
          {intake.urgency && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Urgency
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">
                {intake.urgency === 'ASAP' ? 'ASAP' : 'Can Wait'}
              </dd>
            </div>
          )}
          {intake.issueDescription && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Issue Description
              </dt>
              <dd className="text-sm text-[#1F2937]">{intake.issueDescription}</dd>
            </div>
          )}
          {intake.requestedWindow && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Preferred Service Window
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">{intake.requestedWindow}</dd>
            </div>
          )}
          {intake.serviceFeeMentioned && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Service Fee Discussed
              </dt>
              <dd className="text-sm font-medium text-[#1F2937]">Yes</dd>
            </div>
          )}
          {intake.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#475569]">
                Additional Notes
              </dt>
              <dd className="text-sm text-[#1F2937]">{intake.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Ticket Summary */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] mb-1">
              Ticket Summary
            </h2>
            <p className="text-sm text-[#475569]">
              Generated ticket information
            </p>
          </div>
          <div className="space-y-6">
            {summary.summary_bullets && summary.summary_bullets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-3 text-[#475569]">
                  Call Summary
                </h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-[#1F2937]">
                  {summary.summary_bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript */}
      {call.transcript_text && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#1F2937] mb-1">
              Call Transcript
            </h2>
            <p className="text-sm text-[#475569]">
              Full conversation transcript
            </p>
          </div>
          <div className="rounded-lg p-4 bg-[#F1F5F9] border border-[#E2E8F0]">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#1F2937] font-mono">
              {call.transcript_text}
            </pre>
          </div>
        </div>
      )}

      {/* Recording */}
      {call.recording_url && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#1F2937] mb-1">
              Call Recording
            </h2>
            <p className="text-sm text-[#475569]">
              Listen to the full service call recording
            </p>
          </div>
          <Button 
            asChild
            className="h-11 px-6 rounded-lg font-semibold bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
          >
            <a
              href={call.recording_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Listen to Recording
            </a>
          </Button>
        </div>
      )}

      {/* Error Message */}
      {call.error_message && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
            <h2 className="text-lg font-semibold text-[#DC2626]">
              Error
            </h2>
          </div>
          <p className="text-sm text-[#DC2626]">{call.error_message}</p>
        </div>
      )}
    </div>
  );
}
