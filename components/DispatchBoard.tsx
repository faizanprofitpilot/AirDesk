'use client';

import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TicketCard from './TicketCard';
import { Phone, MapPin, MoreVertical } from 'lucide-react';
import Link from 'next/link';

export type TicketStatus = 'READY' | 'DISPATCHED' | 'COMPLETED';
export type TicketPriority = 'URGENT' | 'NORMAL';

export interface Ticket {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  issueCategory: string;
  issueDescription?: string;
  callerName: string;
  callerPhone?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  requestedWindow?: string;
  createdAt: string;
  recordingUrl?: string | null;
  transcriptSnippet?: string;
}

interface DispatchBoardProps {
  tickets: Ticket[];
  onMoveTicket: (ticketId: string, newStatus: TicketStatus) => Promise<void>;
  filterUrgent?: boolean;
}

const COLUMNS: { id: TicketStatus; title: string; color: string }[] = [
  { id: 'READY', title: 'Ready to Dispatch', color: '#1E40AF' },
  { id: 'DISPATCHED', title: 'Dispatched', color: '#F97316' },
  { id: 'COMPLETED', title: 'Completed', color: '#059669' },
];

export default function DispatchBoard({ tickets, onMoveTicket, filterUrgent = false }: DispatchBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    })
  );

  // Filter tickets if needed
  const filteredTickets = useMemo(() => {
    if (filterUrgent) {
      return tickets.filter(t => t.priority === 'URGENT');
    }
    return tickets;
  }, [tickets, filterUrgent]);

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<TicketStatus, Ticket[]> = {
      READY: [],
      DISPATCHED: [],
      COMPLETED: [],
    };

    filteredTickets.forEach(ticket => {
      // Ensure status is valid, default to READY if invalid
      const validStatus: TicketStatus = 
        ticket.status === 'READY' || ticket.status === 'DISPATCHED' || ticket.status === 'COMPLETED'
          ? ticket.status
          : 'READY';
      
      // Create a new ticket object with valid status (don't mutate original)
      const ticketWithValidStatus: Ticket = {
        ...ticket,
        status: validStatus,
      };
      
      grouped[validStatus].push(ticketWithValidStatus);
    });

    // Sort each group: URGENT first, then newest
    Object.keys(grouped).forEach(status => {
      grouped[status as TicketStatus].sort((a, b) => {
        // Priority first: URGENT before NORMAL
        if (a.priority !== b.priority) {
          return a.priority === 'URGENT' ? -1 : 1;
        }
        // Then by date: newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });

    return grouped;
  }, [filteredTickets]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleMoveTicket = async (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    // Optimistic update
    setIsMoving(ticketId);
    try {
      await onMoveTicket(ticketId, newStatus);
    } catch (error) {
      console.error('Failed to move ticket:', error);
      // Error handling is done in parent component via toast
    } finally {
      setIsMoving(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const ticketId = active.id as string;
    const overId = over.id as string;
    
    // Validate that over.id is a valid column status
    if (overId !== 'READY' && overId !== 'DISPATCHED' && overId !== 'COMPLETED') {
      console.warn('[DispatchBoard] Invalid drop target:', overId);
      return;
    }
    
    const newStatus = overId as TicketStatus;

    await handleMoveTicket(ticketId, newStatus);
  };

  const activeTicket = activeId ? tickets.find(t => t.id === activeId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] mb-1">Dispatch Board</h2>
          <p className="text-sm text-[#475569]">Drag requests as they move through your workflow</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/calls"
            className="text-sm font-medium text-[#1E40AF] hover:text-[#1E3A8A] transition-colors"
          >
            View all calls →
          </Link>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(column => {
            const columnTickets = ticketsByStatus[column.id];
            return (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                tickets={columnTickets}
                isMoving={isMoving}
                onMoveTicket={handleMoveTicket}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTicket ? (
            <div className="opacity-90">
              <TicketCard ticket={activeTicket} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  id,
  title,
  tickets,
  isMoving,
  onMoveTicket,
}: {
  id: TicketStatus;
  title: string;
  tickets: Ticket[];
  isMoving: string | null;
  onMoveTicket: (ticketId: string, newStatus: TicketStatus) => Promise<void>;
}) {
  const ticketIds = tickets.map(t => t.id);
  
  // Make column a droppable area
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#F1F5F9] rounded-xl p-4 border border-[#E2E8F0] min-h-[400px] transition-colors ${
        isOver ? 'bg-blue-50 border-blue-300' : ''
      }`}
      data-column-id={id}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1F2937]">{title}</h3>
        <span className="px-2.5 py-1 rounded-full bg-white text-sm font-semibold text-[#475569] border border-[#E2E8F0]">
          {tickets.length}
        </span>
      </div>

      <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tickets.map(ticket => (
            <SortableTicketCard
              key={ticket.id}
              ticket={ticket}
              isMoving={isMoving === ticket.id}
              onStatusChange={(newStatus) => onMoveTicket(ticket.id, newStatus)}
            />
          ))}
          {tickets.length === 0 && (
            <div className="text-center py-8 text-sm text-[#94A3B8]">
              No tickets
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTicketCard({ ticket, isMoving, onStatusChange }: { ticket: Ticket; isMoving: boolean; onStatusChange?: (newStatus: Ticket['status']) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Detect mobile (simple check)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div ref={setNodeRef} style={style} {...(isMobile ? {} : { ...attributes, ...listeners })}>
      <TicketCard 
        ticket={ticket} 
        isDragging={isDragging} 
        isMoving={isMoving}
        onStatusChange={onStatusChange}
        isMobile={isMobile}
        showMobileMenu={isMobile}
      />
    </div>
  );
}
