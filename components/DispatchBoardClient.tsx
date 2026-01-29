'use client';

import { useState, useEffect, useMemo } from 'react';
import DispatchBoard, { Ticket, TicketStatus } from './DispatchBoard';
import { toastSuccess, toastError } from '@/lib/utils/toast';

interface DispatchBoardClientProps {
  initialTickets: Ticket[];
  firmId: string;
}

export default function DispatchBoardClient({ initialTickets, firmId }: DispatchBoardClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Sync with server data
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const handleMoveTicket = async (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Optimistic update
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    setIsUpdating(ticketId);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update ticket status');
      }

      // Success toast
      const statusLabels: Record<TicketStatus, string> = {
        READY: 'Ready to Dispatch',
        DISPATCHED: 'Dispatched',
        COMPLETED: 'Completed',
      };
      toastSuccess(`Marked as ${statusLabels[newStatus]}`);
    } catch (error) {
      // Revert optimistic update
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, status: ticket.status } : t))
      );
      
      toastError(error instanceof Error ? error.message : 'Failed to update ticket status');
      throw error;
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <DispatchBoard
      tickets={tickets}
      onMoveTicket={handleMoveTicket}
    />
  );
}
