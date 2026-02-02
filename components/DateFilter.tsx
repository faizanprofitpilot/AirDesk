'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';

export type DateFilterOption = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateFilterProps {
  className?: string;
}

export default function DateFilter({ className = '' }: DateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Determine current filter - check if custom dates are set
  // Default to 'all' if no period is specified
  const hasCustomDates = searchParams.get('start') && searchParams.get('end') && 
                         !['today', 'week', 'month', 'year', 'all'].includes(searchParams.get('period') || '');
  const currentFilter = hasCustomDates ? 'custom' : (searchParams.get('period') || 'all') as DateFilterOption;
  
  // Initialize custom dates from URL if present
  useEffect(() => {
    if (hasCustomDates) {
      const start = searchParams.get('start');
      const end = searchParams.get('end');
      if (start) {
        const startDate = new Date(start);
        setCustomStart(startDate.toISOString().split('T')[0]);
      }
      if (end) {
        const endDate = new Date(end);
        setCustomEnd(endDate.toISOString().split('T')[0]);
      }
    }
  }, [hasCustomDates, searchParams]);
  
  // Don't auto-set default - let user choose or server default to 'all'

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowCustomPicker(false);
      }
    };

    if (showCustomPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomPicker]);

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
    if (option === 'custom') {
      setShowCustomPicker(true);
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (option === 'all') {
      params.delete('period');
      params.delete('start');
      params.delete('end');
    } else {
      params.set('period', option);
      const { start, end } = getDateRange(option);
      params.set('start', start.toISOString());
      params.set('end', end.toISOString());
    }

    setShowCustomPicker(false);
    router.push(`?${params.toString()}`);
  };


  const handleCustomDateApply = () => {
    if (!customStart || !customEnd) return;
    
    const startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
    
    if (startDate > endDate) {
      alert('Start date must be before end date');
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'custom');
    params.set('start', startDate.toISOString());
    params.set('end', endDate.toISOString());
    
    setShowCustomPicker(false);
    router.push(`?${params.toString()}`);
  };

  const handleClearCustom = () => {
    setCustomStart('');
    setCustomEnd('');
    setShowCustomPicker(false);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('period');
    params.delete('start');
    params.delete('end');
    router.push(`?${params.toString()}`);
  };

  const options: { value: DateFilterOption; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className={`flex items-center gap-2 relative ${className}`}>
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
      
      {/* Custom Date Picker Popover */}
      {showCustomPicker && (
        <div 
          ref={pickerRef}
          className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg border border-[#E2E8F0] dark:border-gray-700 shadow-xl p-4 min-w-[320px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1F2937] dark:text-white">Custom Date Range</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomPicker(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                max={customEnd || new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                min={customStart}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleCustomDateApply}
                size="sm"
                className="flex-1 h-9 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                disabled={!customStart || !customEnd}
              >
                Apply
              </Button>
              {currentFilter === 'custom' && (
                <Button
                  onClick={handleClearCustom}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
