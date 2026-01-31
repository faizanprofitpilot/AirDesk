'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export type DateFilterOption = 'all' | 'today' | 'week' | 'month' | 'year';

interface DateFilterProps {
  className?: string;
}

export default function DateFilter({ className = '' }: DateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get('period') || 'all') as DateFilterOption;

  const getDateRange = (option: DateFilterOption): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start: Date;

    switch (option) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      default:
        // 'all' - no date filter
        return { start: new Date(0), end: new Date() };
    }

    return { start, end };
  };

  const handleFilterChange = (option: DateFilterOption) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (option === 'all') {
      params.delete('period');
    } else {
      params.set('period', option);
      const { start, end } = getDateRange(option);
      params.set('start', start.toISOString());
      params.set('end', end.toISOString());
    }

    router.push(`?${params.toString()}`);
  };

  const options: { value: DateFilterOption; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="w-4 h-4 text-[#475569] dark:text-white/80" />
      <div className="flex items-center gap-1 bg-white dark:bg-white/10 rounded-lg border border-[#E2E8F0] dark:border-white/20 p-1">
        {options.map((option) => (
          <Button
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            variant="ghost"
            size="sm"
            className={`h-8 px-3 text-sm font-medium transition-colors ${
              currentFilter === option.value
                ? 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A]'
                : 'text-[#475569] dark:text-white/80 hover:bg-[#F1F5F9] dark:hover:bg-white/20 hover:text-[#1F2937]'
            }`}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
