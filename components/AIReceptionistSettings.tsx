'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/clients/supabase';
import { Firm } from '@/types';

interface AIReceptionistSettingsProps {
  firm: Firm | null;
  onSave?: () => void;
}

const DEFAULT_GREETING = "Thank you for calling {{business_name}}. I'm {{agent_name}}, your AI receptionist. I can help you schedule an HVAC service. How can I help you today?";

export default function AIReceptionistSettings({ firm, onSave }: AIReceptionistSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const [customGreeting, setCustomGreeting] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomGreeting, setUseCustomGreeting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  useEffect(() => {
    if (firm) {
      setCustomGreeting(firm.ai_greeting_custom || '');
      // Use ai_knowledge_base for Knowledge Base field (business information)
      setCustomPrompt(firm.ai_knowledge_base || '');
      setUseCustomGreeting(!!firm.ai_greeting_custom);
    }
  }, [firm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !firm) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        ai_knowledge_base: customPrompt.trim() || null,
        ai_greeting_custom: useCustomGreeting && customGreeting.trim() ? customGreeting.trim() : null,
      };

      const { error: updateError } = await supabase
        .from('firms')
        // @ts-ignore - Supabase type inference issue with new fields
        .update(updateData)
        .eq('id', firm.id);

      if (updateError) throw updateError;

      // Update Vapi assistant if it exists
      if (firm.vapi_assistant_id) {
        try {
          const updateResponse = await fetch('/api/vapi/update-assistant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firmId: firm.id }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.warn('Assistant update warning:', errorData);
            // Don't throw - settings are saved, assistant update is best-effort
          } else {
            console.log('Assistant updated successfully');
          }
        } catch (updateError) {
          console.warn('Error updating assistant (non-blocking):', updateError);
          // Don't throw - settings are saved, assistant update is best-effort
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onSave) onSave();
    } catch (err: any) {
      console.error('Error saving AI settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const displayGreeting = useCustomGreeting && customGreeting.trim()
    ? customGreeting.replace(/{{business_name}}/g, (firm as any)?.business_name || 'your HVAC business')
                     .replace(/{{agent_name}}/g, (firm as any)?.agent_name || 'Jessica')
    : DEFAULT_GREETING.replace(/{{business_name}}/g, (firm as any)?.business_name || 'your HVAC business')
                       .replace(/{{agent_name}}/g, (firm as any)?.agent_name || 'Jessica');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#1E40AF' }}>
          Greeting Customization
        </h3>
        <p className="text-sm mb-4" style={{ color: '#475569' }}>
          Customize how the AI receptionist greets callers. Use {'{{business_name}}'} for your business name and {'{{agent_name}}'} for the agent name.
        </p>

        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomGreeting}
              onChange={(e) => setUseCustomGreeting(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
              style={{ accentColor: '#1E40AF' }}
            />
            <span className="text-sm font-medium" style={{ color: '#1E40AF' }}>
              Use custom greeting
            </span>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>
            Default Greeting (Preview)
          </label>
          <div
            className="p-3 rounded-lg border text-sm"
            style={{
              backgroundColor: '#F9FAFB',
              borderColor: '#E2E8F0',
              color: '#475569',
            }}
          >
            {DEFAULT_GREETING.replace(/{{business_name}}/g, (firm as any)?.business_name || 'your HVAC business')
                             .replace(/{{agent_name}}/g, (firm as any)?.agent_name || 'Jessica')}
          </div>
        </div>

        {useCustomGreeting && (
          <div className="mb-4">
            <label htmlFor="customGreeting" className="block text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>
              Custom Greeting
            </label>
            <textarea
              id="customGreeting"
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              placeholder="Enter your custom greeting. Use {{business_name}} and {{agent_name}} as placeholders."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: '#E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#1E40AF',
              }}
            />
            {customGreeting.trim() && (
              <div className="mt-2">
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#475569' }}>
                  Preview:
                </p>
                <div
                  className="p-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: '#F0F9FF',
                    borderColor: '#BFDBFE',
                    color: '#1E40AF',
                  }}
                >
                  {displayGreeting}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#1E40AF' }}>
          Knowledge Base
        </h3>
        <p className="text-sm mb-4" style={{ color: '#475569' }}>
          Provide information about your HVAC business to help the AI receptionist answer questions accurately. Include services you offer, pricing, hours of operation, service areas, and any other relevant details.
        </p>

        <div className="mb-4">
          <label htmlFor="customPrompt" className="block text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>
            Business Information
          </label>
          <textarea
            id="customPrompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Example: We provide HVAC installation, repair, and maintenance services. Our service call fee is $99. We operate Monday-Friday 8am-6pm and offer 24/7 emergency service. We service the greater Chicago area. We specialize in residential and commercial HVAC systems."
            rows={8}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: '#E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
            }}
          />
          <p className="text-xs mt-2" style={{ color: '#475569' }}>
            This information will be added to the AI's knowledge base so it can accurately answer questions about your services, pricing, hours, and more.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">Settings saved successfully!</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#1E40AF', color: '#FFFFFF' }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

