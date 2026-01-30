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
        <div className="bg-gradient-to-r from-[#059669] to-[#10B981] px-6 py-5 text-white shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold mb-0.5">Billing & Subscription</h1>
                <p className="text-sm text-green-100/90">
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
