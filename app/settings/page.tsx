import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/SettingsForm';
import { PlatformLayout } from '@/components/platform-layout';
import { Wrench, Settings as SettingsIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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
              <SettingsIcon className="w-5 h-5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold mb-0.5">HVAC Business Configuration</h1>
                <p className="text-sm text-blue-100/90">
                  Configure your business details, AI receptionist, and notification settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SettingsForm firm={firm} onSave={refreshData} />
        </div>
      </div>
    </PlatformLayout>
  );
}
