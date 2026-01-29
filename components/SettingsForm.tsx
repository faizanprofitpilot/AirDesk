'use client';

import { useState, useEffect, useMemo } from 'react';
import { Firm } from '@/types';
import { createBrowserClient } from '@/lib/clients/supabase';
import PhoneNumberDisplay from './PhoneNumberDisplay';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CheckCircle2, AlertCircle, Phone, MessageSquare, Mail } from 'lucide-react';

interface SettingsFormProps {
  firm: Firm | null;
  onSave: () => void;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'EST/EDT (Eastern)' },
  { value: 'America/Chicago', label: 'CST/CDT (Central)' },
  { value: 'America/Denver', label: 'MST/MDT (Mountain)' },
  { value: 'America/Los_Angeles', label: 'PST/PDT (Pacific)' },
  { value: 'America/Phoenix', label: 'MST (Arizona)' },
  { value: 'America/Anchorage', label: 'AKST/AKDT (Alaska)' },
  { value: 'Pacific/Honolulu', label: 'HST (Hawaii)' },
  { value: 'Europe/London', label: 'GMT/BST (London)' },
  { value: 'Europe/Paris', label: 'CET/CEST (Central European)' },
  { value: 'Europe/Berlin', label: 'CET/CEST (Berlin)' },
  { value: 'Europe/Madrid', label: 'CET/CEST (Madrid)' },
  { value: 'Europe/Rome', label: 'CET/CEST (Rome)' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT (Sydney)' },
  { value: 'Australia/Melbourne', label: 'AEST/AEDT (Melbourne)' },
  { value: 'America/Toronto', label: 'EST/EDT (Toronto)' },
  { value: 'America/Vancouver', label: 'PST/PDT (Vancouver)' },
  { value: 'America/Mexico_City', label: 'CST/CDT (Mexico City)' },
  { value: 'America/Sao_Paulo', label: 'BRT/BRST (São Paulo)' },
];

interface FormData {
  firm_name: string;
  notify_emails: string;
  timezone: string;
  business_hours_open: string;
  business_hours_close: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function SettingsForm({ firm, onSave }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  const initialFormData: FormData = {
    firm_name: firm?.firm_name || '',
    notify_emails: firm?.notify_emails?.join(', ') || '',
    timezone: firm?.timezone || 'America/New_York',
    business_hours_open: firm?.business_hours_open || firm?.open_time || '09:00',
    business_hours_close: firm?.business_hours_close || firm?.close_time || '17:00',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [savedFormData, setSavedFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (firm) {
      const newData: FormData = {
        firm_name: firm.firm_name,
        notify_emails: firm.notify_emails?.join(', ') || '',
        timezone: firm.timezone,
        business_hours_open: firm.business_hours_open || firm.open_time || '09:00',
        business_hours_close: firm.business_hours_close || firm.close_time || '17:00',
      };
      setFormData(newData);
      setSavedFormData(newData);
      setLastSavedAt(new Date());
    }
  }, [firm]);

  const normalizeNotifyEmails = (emailString: string): string => {
    if (!emailString.trim()) return '';
    return emailString
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .join(', ');
  };

  const normalizedFormData = useMemo<FormData>(() => {
    return {
      ...formData,
      firm_name: formData.firm_name.trim(),
      notify_emails: normalizeNotifyEmails(formData.notify_emails),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const normalizedSavedFormData = useMemo<FormData>(() => {
    return {
      ...savedFormData,
      firm_name: savedFormData.firm_name.trim(),
      notify_emails: normalizeNotifyEmails(savedFormData.notify_emails),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedFormData]);

  // Track unsaved changes (stable comparison, not stringify/order-dependent)
  const hasUnsavedChanges = useMemo(() => {
    return (
      normalizedFormData.firm_name !== normalizedSavedFormData.firm_name ||
      normalizedFormData.notify_emails !== normalizedSavedFormData.notify_emails ||
      normalizedFormData.timezone !== normalizedSavedFormData.timezone ||
      normalizedFormData.business_hours_open !== normalizedSavedFormData.business_hours_open ||
      normalizedFormData.business_hours_close !== normalizedSavedFormData.business_hours_close
    );
  }, [normalizedFormData, normalizedSavedFormData]);

  // Validate emails
  const validateEmails = (emailString: string): string[] => {
    if (!emailString.trim()) return [];
    const emails = emailString.split(',').map(e => e.trim()).filter(e => e.length > 0);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid: string[] = [];
    emails.forEach(email => {
      if (!emailRegex.test(email)) {
        invalid.push(email);
      }
    });
    return invalid;
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.firm_name.trim()) {
      errors.firm_name = 'Business name is required';
    }

    const notifyInvalid = validateEmails(formData.notify_emails);
    if (formData.notify_emails.trim() && notifyInvalid.length > 0) {
      errors.notify_emails = `Invalid emails: ${notifyInvalid.join(', ')}`;
    }
    if (!formData.notify_emails.trim()) {
      errors.notify_emails = 'At least one notification email is required';
    }

    if (formData.business_hours_open >= formData.business_hours_close) {
      errors.business_hours = 'Open time must be before close time';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Get valid email count
  const getValidEmailCount = (emailString: string): number => {
    if (!emailString.trim()) return 0;
    const emails = emailString.split(',').map(e => e.trim()).filter(e => e.length > 0);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.filter(email => emailRegex.test(email)).length;
  };


  const handleReset = () => {
    setFormData(savedFormData);
    setValidationErrors({});
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supabase) return;
    
    if (!validateForm()) {
      setError(`Fix ${Object.keys(validationErrors).length} issue${Object.keys(validationErrors).length > 1 ? 's' : ''} to save`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const notifyEmailsArray = normalizedFormData.notify_emails
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const firmData = {
        firm_name: normalizedFormData.firm_name,
        // Backward compatibility: some DBs still enforce business_name NOT NULL
        // Keep it in sync with firm_name to avoid 23502 errors.
        business_name: normalizedFormData.firm_name,
        notify_emails: notifyEmailsArray,
        timezone: normalizedFormData.timezone,
        business_hours_open: normalizedFormData.business_hours_open,
        business_hours_close: normalizedFormData.business_hours_close,
      };

      if (firm) {
        const { error: updateError } = await supabase
          .from('firms')
          // @ts-ignore
          .update(firmData)
          // @ts-ignore
          .eq('id', firm.id);

        if (updateError) {
          console.error('[Settings] Update firms failed:', {
            code: (updateError as any).code,
            message: updateError.message,
            details: (updateError as any).details,
            hint: (updateError as any).hint,
            firmData,
          });
          throw updateError;
        }
      } else {
        // @ts-ignore
        const { data: newFirmData, error: insertError } = await supabase.from('firms').insert({
          ...firmData,
          owner_user_id: user.id,
        }).select().single();

        if (insertError) {
          console.error('[Settings] Insert firms failed:', {
            code: (insertError as any).code,
            message: insertError.message,
            details: (insertError as any).details,
            hint: (insertError as any).hint,
            firmData: { ...firmData, owner_user_id: user.id },
          });
          throw insertError;
        }
        if (!newFirmData) throw new Error('Failed to create firm');
      }

      setSuccess(true);
      setLastSavedAt(new Date());
      // Normalize + set baseline so "Unsaved changes" clears immediately after save
      setFormData(normalizedFormData);
      setSavedFormData(normalizedFormData);
      setValidationErrors({});
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 2000);
    } catch (err: any) {
      // Surface full PostgREST/Supabase error info (400s hide the real reason otherwise)
      const msg =
        err?.details || err?.hint
          ? `${err?.message || 'Request failed'}\n${err?.details ? `Details: ${err.details}` : ''}${err?.hint ? `\nHint: ${err.hint}` : ''}`.trim()
          : err?.message || 'An error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full pb-24">
      {/* Error Summary */}
      {error && Object.keys(validationErrors).length > 0 && (
        <div className="mb-6 p-4 rounded-lg border flex items-start gap-3" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#DC2626', marginTop: '2px' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-0 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Phone Number Display - Only show if number exists */}
            {firm && (firm.inbound_number_e164 || firm.vapi_phone_number || firm.twilio_number) && (
              <Card style={{ borderColor: '#E2E8F0' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#1F2937' }}>Phone Number</CardTitle>
                  <CardDescription style={{ color: '#475569' }}>
                    Your generated phone number for receiving calls
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PhoneNumberDisplay
                    phoneNumber={
                      firm.inbound_number_e164 
                        ? firm.inbound_number_e164
                        : firm.vapi_phone_number && firm.vapi_phone_number.match(/^\+?[1-9]\d{1,14}$/)
                          ? firm.vapi_phone_number
                          : firm.twilio_number
                            ? firm.twilio_number
                            : null
                    }
                    formattedNumber={
                      firm.inbound_number_e164 
                        ? firm.inbound_number_e164.replace(/^\+?(\d{1})(\d{3})(\d{3})(\d{4})$/, '+$1 ($2) $3-$4')
                        : firm.vapi_phone_number && firm.vapi_phone_number.match(/^\+?[1-9]\d{1,14}$/) 
                          ? firm.vapi_phone_number.replace(/^\+?(\d{1})(\d{3})(\d{3})(\d{4})$/, '+$1 ($2) $3-$4')
                          : firm.twilio_number 
                            ? firm.twilio_number.replace(/^\+?(\d{1})(\d{3})(\d{3})(\d{4})$/, '+$1 ($2) $3-$4')
                            : firm.vapi_phone_number_id
                              ? 'Number being assigned...'
                              : 'No number assigned'
                    }
                    isPending={!!firm.vapi_phone_number_id && !firm.inbound_number_e164}
                  />
                </CardContent>
              </Card>
            )}

            {/* Identity Card */}
            <Card style={{ borderColor: '#E2E8F0' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F2937' }}>Identity</CardTitle>
                <CardDescription style={{ color: '#475569' }}>
                  Business name, agent name, and timezone settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="firm_name" className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                    Business Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <Input
                    id="firm_name"
                    value={formData.firm_name}
                    onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                    placeholder="ABC HVAC Services"
                    className={validationErrors.firm_name ? 'border-red-500' : ''}
                    style={{ borderColor: validationErrors.firm_name ? '#DC2626' : '#E2E8F0' }}
                  />
                  {validationErrors.firm_name && (
                    <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>{validationErrors.firm_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border text-sm"
                    style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card style={{ borderColor: '#E2E8F0' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F2937' }}>Notifications</CardTitle>
                <CardDescription style={{ color: '#475569' }}>
                  These inboxes receive a dispatch ticket after every call
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="notify_emails" className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                    Notification Emails <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    id="notify_emails"
                    value={formData.notify_emails}
                    onChange={(e) => setFormData({ ...formData, notify_emails: e.target.value })}
                    onBlur={() => {
                      const invalid = validateEmails(formData.notify_emails);
                      if (invalid.length > 0) {
                        setValidationErrors({ ...validationErrors, notify_emails: `Invalid emails: ${invalid.join(', ')}` });
                      } else if (validationErrors.notify_emails) {
                        const { notify_emails, ...rest } = validationErrors;
                        setValidationErrors(rest);
                      }
                    }}
                    placeholder="dispatch@example.com, manager@example.com"
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border text-sm resize-none"
                    style={{
                      borderColor: validationErrors.notify_emails ? '#DC2626' : '#E2E8F0',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  {validationErrors.notify_emails && (
                    <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>{validationErrors.notify_emails}</p>
                  )}
                  {!validationErrors.notify_emails && formData.notify_emails.trim() && (
                    <p className="mt-1.5 text-xs" style={{ color: '#059669' }}>
                      Found {getValidEmailCount(formData.notify_emails)} valid email{getValidEmailCount(formData.notify_emails) !== 1 ? 's' : ''}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs" style={{ color: '#475569' }}>
                    Comma-separated list of email addresses
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours Card */}
            <Card style={{ borderColor: '#E2E8F0' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F2937' }}>Business Hours</CardTitle>
                <CardDescription style={{ color: '#475569' }}>
                  Configure your business operating hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="business_hours_open" className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                      Open Time
                    </label>
                    <Input
                      type="time"
                      id="business_hours_open"
                      value={formData.business_hours_open}
                      onChange={(e) => setFormData({ ...formData, business_hours_open: e.target.value })}
                      className={validationErrors.business_hours ? 'border-red-500' : ''}
                      style={{ borderColor: validationErrors.business_hours ? '#DC2626' : '#E2E8F0' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="business_hours_close" className="block text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                      Close Time
                    </label>
                    <Input
                      type="time"
                      id="business_hours_close"
                      value={formData.business_hours_close}
                      onChange={(e) => {
                        setFormData({ ...formData, business_hours_close: e.target.value });
                        if (formData.business_hours_open >= e.target.value) {
                          setValidationErrors({ ...validationErrors, business_hours: 'Open time must be before close time' });
                        } else if (validationErrors.business_hours) {
                          const { business_hours, ...rest } = validationErrors;
                          setValidationErrors(rest);
                        }
                      }}
                      className={validationErrors.business_hours ? 'border-red-500' : ''}
                      style={{ borderColor: validationErrors.business_hours ? '#DC2626' : '#E2E8F0' }}
                    />
                  </div>
                </div>
                {validationErrors.business_hours && (
                  <p className="text-xs" style={{ color: '#DC2626' }}>{validationErrors.business_hours}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Previews */}
          <div className="lg:col-span-1 space-y-6">
            {/* What Happens Card */}
            <Card style={{ borderColor: '#E2E8F0', position: 'sticky', top: '1rem' }}>
              <CardHeader>
                <CardTitle style={{ color: '#1F2937' }}>What Happens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E40AF' }}>
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: '#1F2937' }}>AirDesk answers the call</p>
                    <p className="text-xs" style={{ color: '#475569' }}>24/7 AI receptionist handles every incoming call</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E40AF' }}>
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: '#1F2937' }}>Qualifies + captures details</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Collects caller info, issue, and scheduling preference</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E40AF' }}>
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: '#1F2937' }}>Emails your dispatch ticket instantly</p>
                    <p className="text-xs" style={{ color: '#475569' }}>Ready-to-dispatch ticket sent to your inbox</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t py-4 bg-white"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E2E8F0',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#059669' }} />
                  <span className="text-sm font-medium truncate" style={{ color: '#059669' }}>All changes saved</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <span className="text-sm font-medium truncate" style={{ color: '#F59E0B' }}>Unsaved changes</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#059669' }} />
                  <span className="text-sm truncate" style={{ color: '#475569' }}>
                    Saved {lastSavedAt.toLocaleTimeString()}
                  </span>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {hasUnsavedChanges && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                  style={{ borderColor: '#E2E8F0', color: '#475569' }}
                >
                  Reset
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || !hasUnsavedChanges}
                className="flex-1 sm:flex-none"
                style={{
                  backgroundColor: hasUnsavedChanges ? '#1E40AF' : '#94A3B8',
                  color: '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  if (hasUnsavedChanges && !loading) {
                    e.currentTarget.style.backgroundColor = '#1E3A8A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasUnsavedChanges && !loading) {
                    e.currentTarget.style.backgroundColor = '#1E40AF';
                  }
                }}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
