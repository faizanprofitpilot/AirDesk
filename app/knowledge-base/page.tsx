import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import AIFirmKnowledgebase from '@/components/AIFirmKnowledgebase';
import { PlatformLayout } from '@/components/platform-layout';
import { BookOpen, Lightbulb } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasePage() {
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
        <div className="bg-gradient-to-r from-[#F97316] to-[#FB923C] px-6 py-8 text-white shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">Business Knowledge Base</h1>
                <p className="text-orange-100">
                  Teach your AI receptionist about your HVAC business, services, and policies
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base Form */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="bg-gradient-to-r from-[#F1F5F9] to-white p-6 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-[#F97316]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1F2937]">Business Context</h2>
                  <p className="text-sm text-[#475569]">Help your AI understand your services, areas, and policies</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <AIFirmKnowledgebase firm={firm} onSave={refreshData} />
            </div>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}
