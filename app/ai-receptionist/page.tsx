import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import AIReceptionistSettings from '@/components/AIReceptionistSettings';
import { PlatformLayout } from '@/components/platform-layout';
import { Bot, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AIReceptionistPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: firms, error } = await supabase
    .from('firms')
    .select('*')
    .eq('owner_user_id', session.user.id)
    .limit(1)
    .single();

  const firm = firms || null;

  const refreshData = async () => {
    'use server';
  };

  return (
    <PlatformLayout>
      <div className="flex-1 bg-gradient-to-br from-[#F1F5F9] via-white to-[#F1F5F9]">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] px-6 py-5 text-white shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold mb-0.5">AI Receptionist Configuration</h1>
                <p className="text-sm text-blue-100/90">
                  Customize how your AI answers calls and interacts with customers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="bg-gradient-to-r from-[#F1F5F9] to-white p-6 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1F2937]">Voice & Personality</h2>
                  <p className="text-sm text-[#475569]">Configure greeting, tone, and conversation style</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <AIReceptionistSettings firm={firm} onSave={refreshData} />
            </div>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}
