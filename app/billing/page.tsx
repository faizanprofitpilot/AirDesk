import { createServerClient } from '@/lib/clients/supabase';
import { redirect } from 'next/navigation';
import { PlatformLayout } from '@/components/platform-layout';
import BillingClient from '@/components/BillingClient';
import { CreditCard, Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
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
    .single();

  if (firmError) {
    console.error('[Billing] Error fetching firm:', firmError);
    return (
      <PlatformLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>Error loading billing information. Please try refreshing the page.</p>
          </div>
        </div>
      </PlatformLayout>
    );
  }

  const firm = firmData as any;

  return (
    <PlatformLayout>
      <div className="flex-1 bg-gradient-to-br from-[#F1F5F9] via-white to-[#F1F5F9]">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#059669] to-[#10B981] px-6 py-8 text-white shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">Billing & Subscription</h1>
                <p className="text-green-100">
                  Manage your AirDesk subscription, view invoices, and update payment methods
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <BillingClient firm={firm} />
        </div>
      </div>
    </PlatformLayout>
  );
}
