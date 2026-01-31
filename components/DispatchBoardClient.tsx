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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleDeleteTicket = async (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Optimistic update - remove ticket immediately
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setIsDeleting(ticketId);

    try {
      const response = await fetch(`/api/calls/${ticketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete ticket');
      }

      toastSuccess('Ticket deleted successfully');
    } catch (error) {
      // Revert optimistic update - add ticket back
      if (ticket) {
        setTickets(prev => [...prev, ticket].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
      
      toastError(error instanceof Error ? error.message : 'Failed to delete ticket');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <DispatchBoard
      tickets={tickets}
      onMoveTicket={handleMoveTicket}
      onDeleteTicket={handleDeleteTicket}
    />
  );
}
